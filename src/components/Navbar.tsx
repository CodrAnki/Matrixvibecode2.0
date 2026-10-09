import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo, { ORIGINAL_LOGO_SRC } from './Logo'
import MagneticButton from './MagneticButton'
import { useAuth } from '../context/AuthContext'

const LINKS = ['Home', 'About', 'Events', 'Workflow', 'Prizes', 'Contact']

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [spy, setSpy] = useState('home')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { team } = useAuth()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (pathname !== '/') {
      setSpy('')
      return
    }
    const updateActiveSection = () => {
      const marker = window.scrollY + window.innerHeight * 0.35
      let active = 'home'
      LINKS.forEach((link) => {
        const section = document.getElementById(link.toLowerCase())
        if (section && section.getBoundingClientRect().top + window.scrollY <= marker) {
          active = section.id
        }
      })
      setSpy(active)
    }
    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
    }
  }, [pathname])

  const navigateToSection = (link: string) => {
    setOpen(false)
    const sectionId = link.toLowerCase()
    if (pathname !== '/') return

    const section = document.getElementById(sectionId)
    if (!section) return

    navigate({ pathname: '/', hash: link === 'Home' ? '' : `#${sectionId}` })
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#080809]/95 py-2 shadow-[0_12px_32px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl' : 'py-4'}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between gap-4 border-b px-4 transition-all duration-500 md:px-6 ${scrolled ? 'border-transparent py-2.5' : 'border-transparent py-2'}`}
      >
        <Link to="/" aria-label="MATRIX Vibe Coding 2.0 home"><Logo className={scrolled ? 'h-8' : 'h-10'} showImage imageSrc={ORIGINAL_LOGO_SRC} /></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = pathname === '/' && spy === l.toLowerCase()
            return (
              <Link
                key={l}
                to={{ pathname: '/', hash: l === 'Home' ? '' : `#${l.toLowerCase()}` }}
                className={`group relative rounded-lg px-3.5 py-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] transition-colors ${active ? 'text-[#E08B93] [text-shadow:0_0_8px_#C44552]' : 'text-slate-400 hover:text-[#F2C9CC]'}`}
              >
                {l}
                <span className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-[#C44552] to-[#F4F4F5] transition-transform duration-300 ${active ? 'scale-x-100' : 'group-hover:scale-x-100'}`} />
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-3">
          {!team && <Link to="/login" className="hidden font-mono text-[0.7rem] uppercase tracking-[0.2em] text-slate-300 transition-colors hover:text-[#E08B93] sm:block">Login</Link>}
          <div className="hidden items-center gap-2 sm:flex">
            <MagneticButton to="/register" variant="solid" size="sm">Team Register →</MagneticButton>
            {team && <MagneticButton to="/dashboard" variant="ghost" size="sm">Dashboard</MagneticButton>}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-lg border border-[#C44552]/25 bg-[#111113] lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation">
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 top-0 h-px w-5 bg-[#E08B93] transition-transform ${open ? 'translate-y-[6px] rotate-45' : ''}`} />
              <span className={`absolute left-0 top-[6px] h-px w-5 bg-[#E08B93] transition-opacity ${open ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 top-3 h-px w-5 bg-[#E08B93] transition-transform ${open ? '-translate-y-[6px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile primary" className="glass mx-4 mt-2 !rounded-2xl p-4 lg:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => {
              const active = pathname === '/' && spy === l.toLowerCase()
              return (
                <Link key={l} to={{ pathname: '/', hash: l === 'Home' ? '' : `#${l.toLowerCase()}` }} onClick={() => navigateToSection(l)} aria-current={active ? 'location' : undefined} className={`rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-colors hover:bg-[#C44552]/10 ${active ? 'bg-[#C44552]/10 text-[#E08B93]' : 'text-slate-200'}`}>{l}</Link>
              )
            })}
            {!team && <Link to="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-[0.2em] text-slate-200 hover:bg-[#C44552]/10">Login</Link>}
            <Link to="/register" onClick={() => setOpen(false)} className="btn btn-solid mt-2">Team Register →</Link>
            {team && <Link to="/dashboard" onClick={() => setOpen(false)} className="btn btn-ghost mt-2">Dashboard</Link>}
          </div>
        </nav>
      )}
    </header>
  )
}
