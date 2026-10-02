import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/authApi'
import { apiFetch } from '../lib/api'
import type { Team } from '../lib/types'

interface LeaderUser { id: string; name: string; email: string; role: string }

interface AuthCtx {
  team: Team | null
  user: LeaderUser | null
  loading: boolean
  /** Step 1 of 2: password check only. Resolves to the OTP envelope — no session yet. */
  login: (email: string, password: string) => Promise<authApi.LoginOtpEnvelope>
  /** Step 2 of 2: called by the shared /verify-otp page once OTP verification succeeds. */
  hydrate: (user: LeaderUser, team: Team) => void
  register: (input: authApi.RegisterInput) => Promise<authApi.LoginOtpEnvelope>
  logout: () => void
  refresh: () => Promise<void>
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(null)
  const [user, setUser] = useState<LeaderUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ user: LeaderUser; team: Team }>('/auth/me')
      setUser(res.user)
      setTeam(res.team)
    } catch {
      setUser(null)
      setTeam(null)
    }
  }, [])

  useEffect(() => {
    // Session restore on load: the backend's httpOnly cookie (if present) authenticates this call.
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (e: string, p: string) => authApi.loginTeam(e, p), [])

  const hydrate = useCallback((u: LeaderUser, t: Team) => {
    setUser(u)
    setTeam(t)
  }, [])

  const register = useCallback(async (i: authApi.RegisterInput) => authApi.registerTeam(i), [])

  const logout = useCallback(() => {
    authApi.logoutTeam().finally(() => { setTeam(null); setUser(null) })
  }, [])

  const value = useMemo(() => ({ team, user, loading, login, hydrate, register, logout, refresh }), [team, user, loading, login, hydrate, register, logout, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
