import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import { Otp } from '../models/Otp.js'
import { User } from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { EMAIL_RE } from '../utils/memberValidation.js'
import { issueOtp, resendOtp, verifyOtp } from './otpService.js'

/**
 * Forgot-password flow for TEAM accounts. It deliberately reuses the existing OTP machinery
 * (issue / verify / resend, attempt cap, expiry, resend cooldown, send-rate cap) with purpose
 * 'PASSWORD_RESET', so there is exactly one OTP implementation. The only new pieces are:
 *   1. a verified reset OTP is exchanged for a single-use, short-lived reset token (never a session), and
 *   2. that token authorises ONE password change.
 */

const SALT_ROUNDS = 12
const RESET_TOKEN_MINUTES = 10
const TEAM_ROLES = ['TEAM_LEADER', 'TEAM_MEMBER']

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex')
const bad = (message: string, code = 'VALIDATION_ERROR') => new ApiError(400, message, code)

// The shared OTP errors say "log in again"; in this flow the user has to start the reset again.
const RESET_MESSAGES: Record<string, string> = {
  INVALID_VERIFICATION_ID: 'This reset session is invalid or has expired. Please start again.',
  OTP_ALREADY_USED: 'This code has already been used. Please start again.',
}
async function withResetMessages<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (err instanceof ApiError && err.code && RESET_MESSAGES[err.code]) throw new ApiError(err.status, RESET_MESSAGES[err.code], err.code)
    throw err
  }
}

/** Same bounds as registration (8–128 chars) plus at least one letter and one number. */
export function validateNewPassword(password: unknown): string {
  if (typeof password !== 'string' || !password) throw bad('Enter a new password.')
  if (password.length < 8) throw bad('Password must be at least 8 characters.', 'WEAK_PASSWORD')
  if (password.length > 128) throw bad('Password must be 128 characters or fewer.', 'WEAK_PASSWORD')
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) throw bad('Password must include at least one letter and one number.', 'WEAK_PASSWORD')
  return password
}

/** Step 1 — validates the email and sends a reset OTP. */
export async function startPasswordReset(rawEmail: unknown) {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
  if (!email) throw bad('Enter your registered email address.')
  if (email.length > 254 || !EMAIL_RE.test(email)) throw bad('Enter a valid email address.')

  const user = await User.findOne({ email, role: { $in: TEAM_ROLES } })
  if (!user) throw new ApiError(404, 'No team account is registered with this email.', 'ACCOUNT_NOT_FOUND')
  if (!user.active) throw new ApiError(403, 'This account has been disabled', 'ACCOUNT_DISABLED')

  return issueOtp(user, 'PASSWORD_RESET')
}

export const resendResetOtp = (verificationId: unknown) =>
  withResetMessages(() => resendOtp(typeof verificationId === 'string' ? verificationId : '', 'PASSWORD_RESET'))

/** Step 2 — verifies the OTP and hands back a single-use reset token. NEVER creates a login session. */
export async function verifyResetOtp(verificationId: unknown, otp: unknown) {
  const id = typeof verificationId === 'string' ? verificationId : ''
  await withResetMessages(() => verifyOtp(id, typeof otp === 'string' ? otp : '', 'PASSWORD_RESET'))

  const resetToken = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000)
  const stored = await Otp.findOneAndUpdate(
    { verificationId: id, purpose: 'PASSWORD_RESET', verified: true, resetTokenHash: null },
    { resetTokenHash: sha256(resetToken), resetTokenExpiresAt: expiresAt, resetTokenUsed: false },
  )
  if (!stored) throw new ApiError(400, RESET_MESSAGES.INVALID_VERIFICATION_ID, 'INVALID_VERIFICATION_ID')
  return { resetToken, expiresInSeconds: RESET_TOKEN_MINUTES * 60 }
}

/** Step 3 — sets the new password. The token is consumed atomically, so it works exactly once. */
export async function resetPassword(rawToken: unknown, rawPassword: unknown) {
  const expired = () => new ApiError(400, 'Your reset session has expired. Please start again.', 'RESET_TOKEN_EXPIRED')
  const invalid = () => new ApiError(400, 'This reset session is invalid or has already been used. Please start again.', 'RESET_TOKEN_INVALID')

  if (typeof rawToken !== 'string' || !rawToken || rawToken.length > 200) throw invalid()
  const password = validateNewPassword(rawPassword)

  const record = await Otp.findOne({ resetTokenHash: sha256(rawToken), purpose: 'PASSWORD_RESET', verified: true })
  if (!record || record.resetTokenUsed) throw invalid()
  if (!record.resetTokenExpiresAt || record.resetTokenExpiresAt.getTime() <= Date.now()) throw expired()

  const user = await User.findOne({ _id: record.userId, role: { $in: TEAM_ROLES } }).select('+passwordHash')
  if (!user) throw new ApiError(404, 'This account no longer exists.', 'USER_NOT_FOUND')
  if (!user.active) throw new ApiError(403, 'This account has been disabled', 'ACCOUNT_DISABLED')
  // Checked before the token is consumed, so the user can simply try another password.
  if (await bcrypt.compare(password, user.passwordHash)) throw bad('Choose a password you have not used before.', 'SAME_PASSWORD')

  const claimed = await Otp.findOneAndUpdate(
    { _id: record._id, resetTokenUsed: false, resetTokenExpiresAt: { $gt: new Date() } },
    { resetTokenUsed: true },
  )
  if (!claimed) throw invalid()

  try {
    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    await user.save()
  } catch (err) {
    // Nothing was changed — give the token back so the user can retry instead of restarting.
    await Otp.updateOne({ _id: record._id }, { resetTokenUsed: false }).catch(() => undefined)
    throw err
  }
  // Any code still pending for this account is now stale.
  await Otp.updateMany({ userId: user._id, active: true }, { active: false })
}
