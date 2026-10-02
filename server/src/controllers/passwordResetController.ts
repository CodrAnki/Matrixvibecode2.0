import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { startPasswordReset, resendResetOtp, verifyResetOtp, resetPassword } from '../services/passwordResetService.js'

const body = (req: Request) => (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>

/** POST /api/auth/forgot-password — step 1: validates the email and sends a reset OTP. */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { verificationId, maskedEmail, expiresInSeconds } = await startPasswordReset(body(req).email)
  res.json({ success: true, message: 'A password reset code has been sent to your email.', verificationId, maskedEmail, expiresInSeconds })
})

/** POST /api/auth/forgot-password/resend-otp — re-sends the reset OTP (60 s cooldown enforced server-side). */
export const resendForgotPasswordOtp = asyncHandler(async (req: Request, res: Response) => {
  const r = await resendResetOtp(body(req).verificationId)
  res.json({ success: true, message: 'A new code has been sent to your email.', verificationId: r.verificationId, maskedEmail: r.maskedEmail, expiresInSeconds: r.expiresInSeconds })
})

/** POST /api/auth/forgot-password/verify-otp — step 2: verifies the OTP, returns a single-use reset token (no session). */
export const verifyForgotPasswordOtp = asyncHandler(async (req: Request, res: Response) => {
  const b = body(req)
  const { resetToken, expiresInSeconds } = await verifyResetOtp(b.verificationId, b.otp)
  res.json({ success: true, message: 'OTP verified. You can now set a new password.', resetToken, expiresInSeconds })
})

/** POST /api/auth/reset-password — step 3: sets the new password using the reset token. */
export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const b = body(req)
  await resetPassword(b.resetToken, b.password)
  res.json({ success: true, message: 'Your password has been changed. You can now sign in.' })
})
