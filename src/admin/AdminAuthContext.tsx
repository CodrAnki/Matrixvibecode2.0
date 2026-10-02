import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as adminAuthApi from '../api/adminAuthApi'
import type { AdminUser } from '../api/adminAuthApi'

interface AdminAuthCtx {
  admin: AdminUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<adminAuthApi.AdminLoginResult>
  logout: () => void
}
const Ctx = createContext<AdminAuthCtx | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAuthApi.fetchAdminMe().then(setAdmin).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await adminAuthApi.loginAdmin(email, password)
    setAdmin(res.user)
    return res
  }, [])

  const logout = useCallback(() => {
    adminAuthApi.logoutAdmin().finally(() => setAdmin(null))
  }, [])

  const value = useMemo(() => ({ admin, loading, login, logout }), [admin, loading, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdminAuth(): AdminAuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return c
}
