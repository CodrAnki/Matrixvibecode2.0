import { apiFetch, setAuthToken } from '../lib/api'

export interface RegisterInput {
  teamName: string; leaderName: string; email: string; phone: string; college: string
  teamYear?: string | null; branch?: string; password: string
  members: { name: string; email: string; phone?: string; college?: string; branch?: string; year?: string }[]
}

export interface LoginOtpEnvelope { requiresOtp?: true; requiresEmailVerification?: true; message: string; verificationId: string; maskedEmail: string; expiresInSeconds: number }

export async function registerTeam(input: RegisterInput): Promise<LoginOtpEnvelope> {
  // Step 1 of 2: validates and stages the team as pending. No token is issued (or stored) until
  // the Gmail OTP is verified via /verify-otp.
  return apiFetch<LoginOtpEnvelope>('/auth/register', { method: 'POST', body: input })
}

export async function loginTeam(email: string, password: string): Promise<LoginOtpEnvelope> {
  // Step 1 of 2: password check only. No token is issued (or stored) until /verify-otp succeeds.
  return apiFetch<LoginOtpEnvelope>('/auth/login', { method: 'POST', body: { email, password } })
}

export async function logoutTeam(): Promise<void> {
  setAuthToken(null)
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
}
