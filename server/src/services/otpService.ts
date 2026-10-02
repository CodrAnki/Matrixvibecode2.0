import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { Otp } from '../models/Otp.js'
import { User, type UserDoc } from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { sendOtpEmail } from './emailService.js'

const SALT_ROUNDS = 12

export type OtpPurpose = 'AUTH' | 'PASSWORD_RESET'

function envInt(name: string, fallback: number): number {
  const v = Number(process.env[name])
  return Number.isFinite(v) && v > 0 ? v : fallback
}

const OTP_EXPIRES_MINUTES = envInt('OTP_EXPIRES_MINUTES', 5)
const OTP_RESEND_SECONDS = envInt('OTP_RESEND_SECONDS', 60)
const OTP_MAX_ATTEMPTS = envInt('OTP_MAX_ATTEMPTS', 5)
const OTP_MAX_SENDS_PER_WINDOW = 5
const OTP_SEND_WINDOW_MINUTES = 15

function generateSixDigitOtp(): string {
  // Cryptographically secure, uniform over 000000–999999 (crypto.randomInt avoids modulo bias).
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 1)
  const stars = '*'.repeat(Math.min(Math.max(local.length - 1, 3), 8))
  return `${visible}${stars}@${domain}`
}

/**
 * Issues a fresh OTP for a user who has already passed password verification.
 * Invalidates any previous pending OTP for that user, enforces the send-rate cap, sends the
 * email, and only returns the opaque verificationId (plus a masked display email) — never the
 * code itself.
 * Throws (without having created a usable OTP record) if the email fails to send, so callers
 * never end up granting a session or leaving a "valid" OTP the user was never shown.
 */
// Emails currently being issued an OTP by THIS process. Two simultaneous requests for the same
// address (double click, retried request) would otherwise both pass the checks below and send two emails.
const issuing = new Set<string>()

export async function issueOtp(user: Pick<UserDoc, 'email'> & { _id: unknown }, purpose: OtpPurpose = 'AUTH'): Promise<{ verificationId: string; maskedEmail: string; expiresInSeconds: number }> {
  const email = user.email.toLowerCase()
  if (issuing.has(email)) throw new ApiError(429, 'An OTP is already being sent. Please wait a moment.', 'OTP_IN_PROGRESS')
  issuing.add(email)
  try {
    return await issueOtpUnlocked(user, email, purpose)
  } finally {
    issuing.delete(email)
  }
}

async function issueOtpUnlocked(user: Pick<UserDoc, 'email'> & { _id: unknown }, email: string, purpose: OtpPurpose): Promise<{ verificationId: string; maskedEmail: string; expiresInSeconds: number }> {
  const windowStart = new Date(Date.now() - OTP_SEND_WINDOW_MINUTES * 60 * 1000)
  const recentSends = await Otp.countDocuments({ email, createdAt: { $gte: windowStart } })
  if (recentSends >= OTP_MAX_SENDS_PER_WINDOW) {
    throw new ApiError(429, 'Too many OTP requests. Please try again later.', 'OTP_RATE_LIMITED')
  }

  // Login/registration codes keep the original behaviour (a new code replaces any pending one). A reset code
  // only replaces the user's earlier pending RESET codes.
  await Otp.updateMany(purpose === 'PASSWORD_RESET' ? { userId: user._id, active: true, purpose } : { userId: user._id, active: true }, { active: false })

  const rawOtp = generateSixDigitOtp()
  const otpHash = await bcrypt.hash(rawOtp, SALT_ROUNDS)
  const verificationId = crypto.randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000)

  const doc = await Otp.create({ userId: user._id, email, otpHash, verificationId, expiresAt, attempts: 0, verified: false, active: true, purpose })

  try {
    if (purpose === 'PASSWORD_RESET') await sendOtpEmail(email, rawOtp, OTP_EXPIRES_MINUTES, purpose)
    else await sendOtpEmail(email, rawOtp, OTP_EXPIRES_MINUTES)
  } catch (err) {
    // Email failed — this OTP is unusable (the user never saw the code) and must not grant
    // anything. Deactivate it and surface a safe, retryable error; no session is created.
    await Otp.updateOne({ _id: doc._id }, { active: false })
    throw new ApiError(502, 'Could not send the verification email. Please try again in a moment.', 'EMAIL_SEND_FAILED')
  }

  return { verificationId, maskedEmail: maskEmail(email), expiresInSeconds: OTP_EXPIRES_MINUTES * 60 }
}

/** POST /api/auth/resend-otp — re-issues a new OTP against an existing pending verification session. */
export async function resendOtp(verificationId: string, purpose: OtpPurpose = 'AUTH'): Promise<{ verificationId: string; maskedEmail: string; expiresInSeconds: number }> {
  if (typeof verificationId !== 'string' || !verificationId || verificationId.length > 100) throw new ApiError(400, 'verificationId is required')
  const current = await Otp.findOne({ verificationId, active: true })
  if (!current || (current.purpose ?? 'AUTH') !== purpose) throw new ApiError(400, 'This verification session is invalid or has expired. Please log in again.', 'INVALID_VERIFICATION_ID')

  const secondsSinceLastSend = (Date.now() - current.createdAt.getTime()) / 1000
  if (secondsSinceLastSend < OTP_RESEND_SECONDS) {
    throw new ApiError(429, 'Please wait before requesting another OTP.', 'RESEND_COOLDOWN')
  }

  const user = await User.findById(current.userId)
  if (!user) throw new ApiError(404, 'This account no longer exists.', 'USER_NOT_FOUND')
  if (!user.active) throw new ApiError(403, 'This account has been disabled.', 'ACCOUNT_DISABLED')

  return issueOtp(user, purpose)
}

/**
 * POST /api/auth/verify-otp — the only place the final JWT gets created for OTP-gated logins.
 * Returns the User doc on success so the controller can build the role-appropriate response.
 */
export async function verifyOtp(verificationId: string, submittedOtp: string, purpose: OtpPurpose = 'AUTH') {
  if (typeof verificationId !== 'string' || typeof submittedOtp !== 'string' || !verificationId || !submittedOtp) {
    throw new ApiError(400, 'verificationId and otp are required')
  }
  if (verificationId.length > 100) throw new ApiError(400, 'This verification session is invalid or has expired. Please log in again.', 'INVALID_VERIFICATION_ID')
  // Malformed codes are rejected up-front: they can never match, so they must not reach bcrypt.
  if (!/^\d{6}$/.test(submittedOtp)) throw new ApiError(400, 'Invalid OTP. Please try again.', 'OTP_INVALID')

  const otp = await Otp.findOne({ verificationId })
  if (!otp || !otp.active || (otp.purpose ?? 'AUTH') !== purpose) throw new ApiError(400, 'This verification session is invalid or has expired. Please log in again.', 'INVALID_VERIFICATION_ID')
  if (otp.verified) throw new ApiError(400, 'This code has already been used. Please log in again.', 'OTP_ALREADY_USED')
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await Otp.updateOne({ _id: otp._id }, { active: false })
    throw new ApiError(429, 'Too many attempts. Please request a new OTP.', 'OTP_MAX_ATTEMPTS')
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    await Otp.updateOne({ _id: otp._id }, { active: false })
    throw new ApiError(400, 'OTP has expired. Please request a new code.', 'OTP_EXPIRED')
  }

  // Atomically RESERVE an attempt before checking the code. The old read-then-write counter let a
  // burst of parallel guesses all read attempts=0, so the 5-try cap could be sidestepped. With a
  // conditional $inc, at most OTP_MAX_ATTEMPTS requests can ever get past this line per OTP.
  const reserved = await Otp.findOneAndUpdate(
    { _id: otp._id, active: true, verified: false, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true },
  )
  if (!reserved) {
    const latest = await Otp.findOne({ _id: otp._id })
    if (!latest || !latest.active || latest.verified) throw new ApiError(400, 'This verification session is invalid or has expired. Please log in again.', 'INVALID_VERIFICATION_ID')
    throw new ApiError(429, 'Too many attempts. Please request a new OTP.', 'OTP_MAX_ATTEMPTS')
  }

  const match = await bcrypt.compare(submittedOtp, otp.otpHash)
  if (!match) {
    const exhausted = reserved.attempts >= OTP_MAX_ATTEMPTS
    if (exhausted) await Otp.updateOne({ _id: otp._id }, { active: false })
    if (exhausted) throw new ApiError(429, 'Too many attempts. Please request a new OTP.', 'OTP_MAX_ATTEMPTS')
    throw new ApiError(400, 'Invalid OTP. Please try again.', 'OTP_INVALID')
  }

  // Atomic compare-and-set: only the request that actually flips active:true -> false here wins.
  // A second, concurrent, correctly-guessed verify for the same OTP finds no matching document
  // (active is already false) and falls through to INVALID_VERIFICATION_ID below — it can never
  // also mint a session.
  const claimed = await Otp.findOneAndUpdate({ _id: otp._id, active: true, verified: false }, { verified: true, active: false })
  if (!claimed) throw new ApiError(400, 'This code has already been used. Please log in again.', 'OTP_ALREADY_USED')

  const user = await User.findById(otp.userId)
  if (!user) throw new ApiError(404, 'This account no longer exists.', 'USER_NOT_FOUND')
  if (!user.active) throw new ApiError(403, 'This account has been disabled.', 'ACCOUNT_DISABLED')

  return user
}
