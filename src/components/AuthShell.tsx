import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from './Logo'
import SceneBackdrop from './SceneBackdrop'
import { useMediaQuery } from '../hooks/useMediaQuery'

export default function AuthShell({ kicker, title, sub, children, logoImageSrc, compact = false }: { kicker: string; title: string; sub: string; children: ReactNode; logoImageSrc?: string; compact?: boolean }) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const cardClass = compact ? 'max-w-xl p-5 sm:p-6' : 'max-w-md p-7 md:p-9'
  return (
    <div className="relative isolate grid min-h-[100svh] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        {desktop && <SceneBackdrop variant="auth" className="absolute inset-0" />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-void" />
        <div className="scanlines pointer-events-none absolute inset-0" />
        <div className="absolute left-10 top-8"><Link to="/"><Logo className="h-11" imageSrc={logoImageSrc} /></Link></div>
        <div className="absolute bottom-10 left-10 right-10">
          <p className="hud-label">System status</p>
          <p className="mt-2 font-mono text-xs text-red-200/70"><span className="blink text-red-300">●</span> MATRIX NETWORK ONLINE · SECURE CHANNEL</p>
        </div>
      </div>
      <div className={`relative z-10 flex min-h-[100svh] flex-col items-center px-3 pb-3 pt-16 lg:min-h-0 lg:justify-center lg:px-5 ${compact ? 'lg:py-3' : 'lg:py-10'}`}>
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden lg:hidden">
          <SceneBackdrop variant="auth" className="absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-void/25 via-void/35 to-void/75" />
        </div>
        <div className="absolute left-4 top-3 z-20 lg:hidden"><Link to="/"><Logo className="h-8" imageSrc={logoImageSrc} /></Link></div>
        <motion.div initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className={`auth-card glass hud-corners relative z-10 w-full ${cardClass}`}>
          <p className="hud-label">{kicker}</p>
          <h1 className={`display mt-2 text-grad ${compact ? 'text-3xl' : 'mt-3 text-4xl'}`}>{title}</h1>
          <p className={`text-sm text-slate-100/60 ${compact ? 'mb-3 mt-1' : 'mb-7 mt-3'}`}>{sub}</p>
          {children}
        </motion.div>
      </div>
    </div>
  )
}
