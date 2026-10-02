import { apiFetch, setAuthToken } from '../lib/api'

export interface AdminUser { id: string; name: string; email: string; role: 'ADMIN' | 'SUPER_ADMIN' }
export interface LoginOtpEnvelope { requiresOtp: true; message: string; verificationId: string; maskedEmail: string; expiresInSeconds: number }

export async function loginAdmin(email: string, password: string): Promise<LoginOtpEnvelope> {
  // Step 1 of 2: password check only. No token is issued (or stored) until /verify-otp succeeds.
  return apiFetch<LoginOtpEnvelope>('/admin/login', { method: 'POST', body: { email, password } })
}

export async function fetchAdminMe(): Promise<AdminUser | null> {
  try {
    const res = await apiFetch<{ user: AdminUser }>('/admin/me')
    return res.user
  } catch {
    return null
  }
}

export async function logoutAdmin(): Promise<void> {
  setAuthToken(null)
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
}
