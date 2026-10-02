import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as adminAuthApi from '../api/adminAuthApi'
import type { AdminUser } from '../api/adminAuthApi'

interface AdminAuthCtx {
  admin: AdminUser | null
  loading: boolean
  /** Step 1 of 2: password check only. Resolves to the OTP envelope — no session yet. */
  login: (email: string, password: string) => Promise<adminAuthApi.LoginOtpEnvelope>
  /** Step 2 of 2: called by the shared /verify-otp page once OTP verification succeeds. */
  hydrate: (user: AdminUser) => void
  logout: () => void
}
const Ctx = createContext<AdminAuthCtx | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAuthApi.fetchAdminMe().then(setAdmin).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => adminAuthApi.loginAdmin(email, password), [])

  const hydrate = useCallback((user: AdminUser) => setAdmin(user), [])

  const logout = useCallback(() => {
    adminAuthApi.logoutAdmin().finally(() => setAdmin(null))
  }, [])

  const value = useMemo(() => ({ admin, loading, login, hydrate, logout }), [admin, loading, login, hydrate, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdminAuth(): AdminAuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return c
}
