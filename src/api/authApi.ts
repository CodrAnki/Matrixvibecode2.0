import { apiFetch, setAuthToken } from '../lib/api'
import type { Team } from '../lib/types'

export interface RegisterInput {
  teamName: string; leaderName: string; email: string; phone: string
  teamYear?: string | null; password: string
  members: { name: string; email: string; phone?: string; year?: string }[]
}

export interface LoginUser { id: string; name: string; email: string; role: string }
export interface LoginResult { user: LoginUser; team: Team }

// No email step anywhere in this app (no verified sending domain) — registration and login both
// issue a session immediately on success.
export async function registerTeam(input: RegisterInput): Promise<LoginResult> {
  const res = await apiFetch<{ token: string; user: LoginUser; team: Team }>('/auth/register', { method: 'POST', body: input })
  setAuthToken(res.token)
  return { user: res.user, team: res.team }
}

export async function loginTeam(email: string, password: string): Promise<LoginResult> {
  const res = await apiFetch<{ token: string; user: LoginUser; team: Team }>('/auth/login', { method: 'POST', body: { email, password } })
  setAuthToken(res.token)
  return { user: res.user, team: res.team }
}

export async function logoutTeam(): Promise<void> {
  setAuthToken(null)
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined)
}
