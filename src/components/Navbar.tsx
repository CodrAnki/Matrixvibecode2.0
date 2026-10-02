import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'
import MagneticButton from './MagneticButton'
import { useAuth } from '../context/AuthContext'

const LINKS = ['Home', 'About', 'Events', 'Workflow', 'Prizes', 'Contact']

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [spy, setSpy] = useState('home')
  const { pathname } = useLocation()
  const { team } = useAuth()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (pathname !== '/') return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSpy(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    LINKS.forEach((l) => { const el = document.getElementById(l.toLowerCase()); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [pathname])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'py-2' : 'py-4'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between gap-4 border-b px-4 transition-all duration-500 md:px-6 ${scrolled ? '!rounded-2xl border py-2.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.8)]' : 'py-2 border-transparent'}`}
        style={scrolled ? { background: '#070908', borderColor: 'rgba(255,255,255,0.06)' } : undefined}
      >
        <Link to="/" aria-label="MATRIX Vibe Coding 2.0 home"><Logo className={scrolled ? 'h-8' : 'h-10'} /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = pathname === '/' && spy === l.toLowerCase()
            return (
              <Link
                key={l}
                to={{ pathname: '/', hash: l === 'Home' ? '' : `#${l.toLowerCase()}` }}
                className={`group relative rounded-lg px-3.5 py-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] transition-colors ${active ? 'text-[#6dffb0] [text-shadow:0_0_14px_#00FF66]' : 'text-slate-400 hover:text-[#baffd4]'}`}
              >
                {l}
                <span className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[#00FF66] to-[#00D9FF] transition-transform duration-300 ${active ? 'scale-x-100' : 'group-hover:scale-x-100'}`} />
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          {!team && <Link to="/login" className="hidden font-mono text-[0.7rem] uppercase tracking-[0.2em] text-slate-300 transition-colors hover:text-[#6dffb0] sm:block">Login</Link>}
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to="/admin/login"
              className="group relative flex items-center gap-1.5 rounded-lg border border-[#00D9FF]/30 bg-[#06111F]/80 px-3.5 py-2 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#8fe3ff] shadow-[0_0_20px_-8px_rgba(0,217,255,0.5)] backdrop-blur transition-all duration-300 hover:border-[#00D9FF]/60 hover:text-[#c9f6ff] hover:shadow-[0_0_28px_-6px_rgba(0,217,255,0.7)]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
              </svg>
              Admin Panel
            </Link>
            <MagneticButton to="/register" variant="solid" size="sm">Team Register →</MagneticButton>
            {team && <MagneticButton to="/dashboard" variant="ghost" size="sm">Dashboard</MagneticButton>}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-lg border border-[#00FF66]/25 bg-[#0D1110] lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 top-0 h-px w-5 bg-[#6dffb0] transition-transform ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
              <span className={`absolute left-0 top-[6px] h-px w-5 bg-[#6dffb0] transition-opacity ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 top-3 h-px w-5 bg-[#6dffb0] transition-transform ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <div className="glass mx-4 mt-2 !rounded-2xl p-4 lg:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <Link key={l} to={{ pathname: '/', hash: l === 'Home' ? '' : `#${l.toLowerCase()}` }} className="rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-200 hover:bg-[#00FF66]/10">{l}</Link>
            ))}
            {!team && <Link to="/login" className="rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-200 hover:bg-[#00FF66]/10">Login</Link>}
            <Link
              to="/admin/login"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-[#00D9FF]/30 bg-[#06111F]/80 px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#8fe3ff]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
              </svg>
              Admin Panel
            </Link>
            <Link to="/register" className="btn btn-solid mt-2">Team Register →</Link>
            {team && <Link to="/dashboard" className="btn btn-ghost mt-2">Dashboard</Link>}
          </div>
        </div>
      )}
    </header>
  )
}
