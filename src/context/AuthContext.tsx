import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/authApi'
import { apiFetch } from '../lib/api'
import type { Team } from '../lib/types'

interface LeaderUser { id: string; name: string; email: string; role: string }

interface AuthCtx {
  team: Team | null
  user: LeaderUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<authApi.LoginResult>
  register: (input: authApi.RegisterInput) => Promise<authApi.LoginResult>
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

  const login = useCallback(async (e: string, p: string) => {
    const res = await authApi.loginTeam(e, p)
    setUser(res.user)
    setTeam(res.team)
    return res
  }, [])

  const register = useCallback(async (i: authApi.RegisterInput) => {
    const res = await authApi.registerTeam(i)
    setUser(res.user)
    setTeam(res.team)
    return res
  }, [])

  const logout = useCallback(() => {
    authApi.logoutTeam().finally(() => { setTeam(null); setUser(null) })
  }, [])

  const value = useMemo(() => ({ team, user, loading, login, register, logout, refresh }), [team, user, loading, login, register, logout, refresh])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used inside AuthProvider')
  return c
}
