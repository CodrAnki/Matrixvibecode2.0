import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from './Logo'
import SceneBackdrop, { StaticBackdrop } from './SceneBackdrop'
import { useMediaQuery } from '../hooks/useMediaQuery'

export default function AuthShell({ kicker, title, sub, children }: { kicker: string; title: string; sub: string; children: ReactNode }) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  return (
    <div className="relative grid min-h-[100svh] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        {desktop ? <SceneBackdrop variant="auth" className="absolute inset-0" /> : <StaticBackdrop />}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-void" />
        <div className="scanlines pointer-events-none absolute inset-0" />
        <div className="absolute left-10 top-8"><Link to="/"><Logo className="h-11" /></Link></div>
        <div className="absolute bottom-10 left-10 right-10">
          <p className="hud-label">System status</p>
          <p className="mt-2 font-mono text-xs text-cyan-200/70"><span className="blink text-emerald-300">●</span> MATRIX NETWORK ONLINE · SECURE CHANNEL</p>
        </div>
      </div>
      <div className="relative flex items-center justify-center px-5 py-24 lg:py-10">
        <div className="pointer-events-none absolute inset-0 lg:hidden"><StaticBackdrop /></div>
        <div className="absolute left-5 top-6 lg:hidden"><Link to="/"><Logo className="h-9" /></Link></div>
        <motion.div initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="glass hud-corners relative w-full max-w-md p-7 md:p-9">
          <p className="hud-label">{kicker}</p>
          <h1 className="display mt-3 text-4xl text-grad">{title}</h1>
          <p className="mb-7 mt-3 text-sm text-sky-100/60">{sub}</p>
          {children}
        </motion.div>
      </div>
    </div>
  )
}
