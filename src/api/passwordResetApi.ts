import { apiFetch } from '../lib/api'

export interface ResetOtpEnvelope { message: string; verificationId: string; maskedEmail: string; expiresInSeconds: number }

/** Step 1: validates the registered email and sends a reset OTP. */
export function requestPasswordReset(email: string): Promise<ResetOtpEnvelope> {
  return apiFetch<ResetOtpEnvelope>('/auth/forgot-password', { method: 'POST', body: { email } })
}

/** Re-sends the code for an existing reset session (the server enforces the 60 s cooldown). */
export function resendPasswordResetOtp(verificationId: string): Promise<ResetOtpEnvelope> {
  return apiFetch<ResetOtpEnvelope>('/auth/forgot-password/resend-otp', { method: 'POST', body: { verificationId } })
}

/** Step 2: verifies the OTP. Returns a single-use reset token — this does NOT sign the user in. */
export function verifyPasswordResetOtp(verificationId: string, otp: string): Promise<{ resetToken: string; expiresInSeconds: number }> {
  return apiFetch('/auth/forgot-password/verify-otp', { method: 'POST', body: { verificationId, otp } })
}

/** Step 3: sets the new password using the reset token from step 2. */
export function resetPassword(resetToken: string, password: string): Promise<{ message: string }> {
  return apiFetch('/auth/reset-password', { method: 'POST', body: { resetToken, password } })
}
