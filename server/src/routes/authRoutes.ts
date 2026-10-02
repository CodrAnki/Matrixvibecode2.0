import { Router } from 'express'
import { registerTeam, loginTeam, getMe, logout, verifyOtp, resendOtp } from '../controllers/authController.js'
import { forgotPassword, resendForgotPasswordOtp, verifyForgotPasswordOtp, resetPasswordHandler } from '../controllers/passwordResetController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.post('/register', registerTeam)
router.post('/login', loginTeam)
// Shared by both /api/auth/login and /api/admin/login — a verificationId is role-agnostic.
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
// Forgot password: email -> OTP -> verify (returns a single-use reset token, never a session) -> new password.
router.post('/forgot-password', forgotPassword)
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp)
router.post('/forgot-password/resend-otp', resendForgotPasswordOtp)
router.post('/reset-password', resetPasswordHandler)
router.get('/me', requireAuth, requireRole('TEAM_LEADER', 'TEAM_MEMBER'), getMe)
router.post('/logout', logout)

export default router
