import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, ShieldCheck, X } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/AuthContext'

export const NAV_LINKS = [
  { label: 'Vibe Coding 2.0', id: 'event' },
  { label: 'Problem Statements', id: 'problems' },
  { label: 'How it works', id: 'how' },
  { label: 'Vibe 1.0', id: 'first-vibe' },
  { label: 'Details', id: 'details' },
]

const hashTo = (id: string) => ({ pathname: '/', hash: `#${id}` })

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [spy, setSpy] = useState('')
  const { pathname } = useLocation()
  const { team } = useAuth()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  useEffect(() => {
    if (pathname !== '/') return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSpy(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    NAV_LINKS.forEach((l) => { const el = document.getElementById(l.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300 ${scrolled || open ? 'border-white/10 bg-ink/80 backdrop-blur-md' : 'border-transparent'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className={`mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 transition-[height] duration-300 md:px-10 ${scrolled ? 'h-14' : 'h-[4.5rem]'}`}>
        <Link to="/" aria-label="MATRIX JEC, Vibe Coding 2.0 home" className="shrink-0"><Logo className={scrolled ? 'h-7' : 'h-8'} /></Link>

        <nav className="hidden items-center gap-6 xl:gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => {
            const active = pathname === '/' && spy === l.id
            return (
              <Link key={l.id} to={hashTo(l.id)} aria-current={active ? 'true' : undefined} className={`group relative py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] transition-colors ${active ? 'text-paper' : 'text-silver hover:text-paper'}`}>
                {l.label}
                <span className={`absolute inset-x-0 bottom-0 h-px origin-left bg-accent transition-transform duration-300 ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {!team && <Link to="/login" className="hidden font-mono text-[0.7rem] uppercase tracking-[0.14em] text-silver transition-colors hover:text-paper xl:block">Login</Link>}
          {team && <Link to="/dashboard" className="hidden font-mono text-[0.7rem] uppercase tracking-[0.14em] text-silver transition-colors hover:text-paper xl:block">Dashboard</Link>}
          <Link to="/admin/login" aria-label="Organizer admin panel" title="Admin panel" className="hidden h-9 w-9 place-items-center rounded text-silver transition-colors hover:text-paper md:grid"><ShieldCheck className="h-4 w-4" strokeWidth={1.5} /></Link>
          <Link to="/register" className="btn btn-solid btn-sm"><span className="sm:hidden">Register</span><span className="hidden sm:inline">Register now</span> <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} /></Link>
          <button className="grid h-11 w-11 place-items-center rounded border border-white/15 text-paper lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu">
            {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-[calc(4.5rem+env(safe-area-inset-top))] overflow-y-auto bg-ink px-5 pb-10 pt-6 lg:hidden">
          <nav aria-label="Mobile" className="border-t border-white/10">
            {NAV_LINKS.map((l, i) => (
              <Link key={l.id} to={hashTo(l.id)} onClick={() => setOpen(false)} className="flex items-baseline justify-between border-b border-white/10 py-4">
                <span className="display text-3xl text-paper">{l.label}</span>
                <span className="font-mono text-xs text-silver">{String(i + 1).padStart(2, '0')}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-8 grid gap-3">
            <Link to="/register" onClick={() => setOpen(false)} className="btn btn-solid btn-lg">Register now <ArrowUpRight className="h-4 w-4" /></Link>
            {team ? <Link to="/dashboard" className="btn">Dashboard</Link> : <Link to="/login" className="btn">Team login</Link>}
            <Link to="/admin/login" className="btn"><ShieldCheck className="h-4 w-4" strokeWidth={1.5} /> Admin panel</Link>
          </div>
        </div>
      )}
    </header>
  )
}
