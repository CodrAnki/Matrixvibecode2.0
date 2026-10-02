import { apiFetch, setAuthToken } from '../lib/api'

export interface AdminUser { id: string; name: string; email: string; role: 'ADMIN' | 'SUPER_ADMIN' }
export interface AdminLoginResult { user: AdminUser }

export async function loginAdmin(email: string, password: string): Promise<AdminLoginResult> {
  // No OTP step — a correct password issues a session immediately.
  const res = await apiFetch<{ token: string; user: AdminUser }>('/admin/login', { method: 'POST', body: { email, password } })
  setAuthToken(res.token)
  return { user: res.user }
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
