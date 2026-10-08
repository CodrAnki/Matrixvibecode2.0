import { useEffect, useState } from 'react'
import { Link, useLocation, type To } from 'react-router-dom'
import Logo from './Logo'
import MagneticButton from './MagneticButton'
import { useAuth } from '../context/AuthContext'
import { useEventPhase } from '../lib/eventPhase'
import { useTapTrigger } from '../hooks/useTapTrigger'
import { triggerEasterEgg } from '../lib/easterEgg'

// Home sections scroll in place (`id`); Problems and Support are their own pages (`route`).
const LINKS: { label: string; id?: string; route?: string }[] = [
  { label: 'Home', id: 'home' },
  { label: 'About', id: 'about' },
  { label: 'Mini-Games', id: 'games' },
  { label: 'Workflow', id: 'workflow' },
  { label: 'Prizes', id: 'prizes' },
  { label: 'Problems', route: '/problems' },
  { label: 'Support', route: '/support' },
]
const SECTION_IDS = LINKS.flatMap((l) => (l.id ? [l.id] : []))
const target = (l: (typeof LINKS)[number]): To =>
  l.route ?? { pathname: '/', hash: l.id === 'home' ? '' : `#${l.id}` }

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [spy, setSpy] = useState('home')
  const { pathname, key } = useLocation()
  const { team } = useAuth()
  const { registrationOpen } = useEventPhase()
  // A signed-in team is never shown "Register" again, regardless of whether registration is still
  // open — they already have an account. Otherwise: register while open, or once registrations
  // close (event day) the button leads to the problem statements instead.
  const cta = team
    ? { to: '/dashboard', label: 'Dashboard →' }
    : registrationOpen
      ? { to: '/register', label: 'Team Register →' }
      : { to: '/problems', label: 'Problems →' }
  // Easter egg: 5 quick taps on the logo. Doesn't stop it navigating home as normal.
  const onLogoTap = useTapTrigger(triggerEasterEgg)

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [key])
  useEffect(() => {
    if (pathname !== '/') return
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSpy(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    SECTION_IDS.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#080809]/95 py-2 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl' : 'py-4'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between gap-4 border-b px-4 transition-all duration-500 md:px-6 ${scrolled ? 'border-transparent py-2.5' : 'border-transparent py-2'}`}
      >
        <Link to="/" aria-label="MATRIX, JEC — Vibe Coding 2.0 home" onClick={onLogoTap}><Logo className={scrolled ? 'h-8' : 'h-10'} showImage /></Link>
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = l.route ? pathname === l.route : pathname === '/' && spy === l.id
            return (
              <Link
                key={l.label}
                to={target(l)}
                aria-current={active ? (l.route ? 'page' : 'location') : undefined}
                className={`group relative rounded px-3.5 py-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] transition-colors ${active ? 'text-[#70D6A2]' : 'text-slate-400 hover:text-[#70D6A2]'}`}
              >
                {l.label}
                <span className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-[#38B878] transition-transform duration-300 ${active ? 'scale-x-100' : 'group-hover:scale-x-100'}`} />
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          {!team && <Link to="/login" className="hidden font-mono text-[0.7rem] uppercase tracking-[0.2em] text-slate-300 transition-colors hover:text-[#70D6A2] sm:block">Login</Link>}
          <div className="hidden items-center gap-2 sm:flex">
            <MagneticButton to={cta.to} variant="solid" size="sm">{cta.label}</MagneticButton>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded border border-white/12 bg-[#111113] transition-colors hover:border-[#38B878]/60 xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 top-0 h-px w-5 transition-transform ${open ? 'translate-y-[6px] rotate-45 bg-[#70D6A2]' : 'bg-[#E08B93]'}`} />
              <span className={`absolute left-0 top-[6px] h-px w-5 bg-[#E08B93] transition-opacity ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 top-3 h-px w-5 transition-transform ${open ? '-translate-y-[6px] -rotate-45 bg-[#70D6A2]' : 'bg-[#E08B93]'}`} />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <div className="glass mx-4 mt-2 !rounded-2xl p-4 xl:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => {
              const active = l.route ? pathname === l.route : pathname === '/' && spy === l.id
              return (
                <Link
                  key={l.label}
                  to={target(l)}
                  aria-current={active ? (l.route ? 'page' : 'location') : undefined}
                  className={`rounded px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:bg-[#38B878]/10 hover:text-[#70D6A2] ${active ? 'text-[#70D6A2]' : 'text-slate-200'}`}
                >
                  {l.label}
                </Link>
              )
            })}
            {!team && <Link to="/login" className="rounded px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-200 transition-colors hover:bg-[#38B878]/10 hover:text-[#70D6A2]">Login</Link>}
            <Link to={cta.to} className="btn btn-solid mt-2">{cta.label}</Link>
          </div>
        </div>
      )}
    </header>
  )
}
