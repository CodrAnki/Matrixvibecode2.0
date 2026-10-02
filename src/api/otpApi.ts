import { apiFetch, setAuthToken } from '../lib/api'
import type { Team } from '../lib/types'

export interface OtpUser { id: string; name: string; email: string; role: 'TEAM_LEADER' | 'TEAM_MEMBER' | 'ADMIN' | 'SUPER_ADMIN' }
export interface VerifyOtpResult { user: OtpUser; team?: Team }

export async function verifyOtp(verificationId: string, otp: string): Promise<VerifyOtpResult> {
  const res = await apiFetch<{ token: string; user: OtpUser; team?: Team }>('/auth/verify-otp', {
    method: 'POST',
    body: { verificationId, otp },
  })
  setAuthToken(res.token)
  return { user: res.user, team: res.team }
}

export async function resendOtp(verificationId: string): Promise<{ verificationId: string; message: string; maskedEmail: string; expiresInSeconds: number }> {
  return apiFetch('/auth/resend-otp', { method: 'POST', body: { verificationId } })
}
