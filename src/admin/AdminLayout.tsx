import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAdminAuth } from './AdminAuthContext'
import Logo, { ORIGINAL_LOGO_SRC } from '../components/Logo'

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true, superOnly: false },
  { to: '/admin/teams', label: 'Teams', superOnly: false },
  { to: '/admin/teams/deleted', label: 'Deleted Teams', superOnly: false },
  { to: '/admin/problems', label: 'Problem Statements', superOnly: false },
  { to: '/admin/announcements', label: 'Announcements', superOnly: false },
  { to: '/admin/checkins', label: 'Check-ins', superOnly: false },
  { to: '/admin/accounts', label: 'Admin Accounts', superOnly: true },
  // Only SUPER_ADMIN manages system-wide settings (spec: SUPER_ADMIN "Manage system settings").
  { to: '/admin/settings', label: 'Settings', superOnly: true },
]

export default function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  if (loading) return <div className="grid min-h-[100svh] place-items-center bg-void"><p className="hud-label">Authenticating…</p></div>
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />
  const nav = NAV.filter((n) => !n.superOnly || admin.role === 'SUPER_ADMIN')

  return (
    <div className="min-h-[100svh] bg-void text-white">
      <div className="grid lg:grid-cols-[15rem_1fr]">
        <aside className={`admin-glass fixed inset-y-0 left-0 z-40 w-64 -translate-x-full overflow-y-auto p-5 transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : ''}`}>
          <Link to="/" className="mb-6 block px-1" aria-label="MATRIX home">
            <Logo className="h-9" imageSrc={ORIGINAL_LOGO_SRC} />
          </Link>
          <div className="mb-6 flex items-center gap-2 px-1">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#F4F4F5]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" strokeLinejoin="round" /></svg>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-red-200/80">Command Center</span>
          </div>
          <nav className="grid gap-1">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-lg px-3 py-2.5 font-mono text-xs uppercase tracking-widest transition-colors ${isActive ? 'bg-[#F4F4F5]/12 text-[#F2C9CC] shadow-[inset_0_0_0_1px_rgba(196,69,82,0.3)]' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={logout} className="mt-6 w-full rounded-lg border border-rose-400/30 px-3 py-2.5 text-left font-mono text-xs uppercase tracking-widest text-rose-300 hover:bg-rose-500/10">Logout</button>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-white/5 px-5 py-4 lg:hidden">
            <Link to="/" aria-label="MATRIX home">
              <Logo className="h-8" imageSrc={ORIGINAL_LOGO_SRC} />
            </Link>
            <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-200">Menu</button>
          </header>
          <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
