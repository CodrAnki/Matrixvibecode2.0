import { motion } from 'framer-motion'
import Reveal from './Reveal'
import TiltCard from './TiltCard'
import Trophy from './Trophy'
import MagneticButton from './MagneticButton'
import { useMediaQuery } from '../hooks/useMediaQuery'

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Standalone "Special Prize for First Year" section. Sits directly under the Prize Pool section
 * (the negative top margin cancels most of the Prize Pool's bottom padding so the two read as
 * neighbours). Uses the site's glass/3D card system: TiltCard, hud corners, green + cyan glow.
 */
export default function SpecialPrize() {
  const narrow = useMediaQuery('(max-width: 767px)')
  return (
    <section id="special-prize" aria-label="Special Prize for First Year" className="relative -mt-14 px-5 pb-28 md:-mt-20 md:px-10 md:pb-36">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[46vmin] w-[70vmin] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.12),rgba(0,255,102,0.06)_45%,transparent_70%)] blur-xl" />
      <div className="relative mx-auto max-w-5xl" style={{ perspective: 1200 }}>
        <Reveal>
          <TiltCard className="hud-corners !border-[#00FF66]/30 p-6 shadow-[0_0_60px_-18px_rgba(0,255,102,0.45),0_0_50px_-20px_rgba(0,217,255,0.4)] sm:p-8 md:p-12" max={narrow ? 3 : 6}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(0,255,102,0.18),transparent_65%)]" />
              <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(0,217,255,0.16),transparent_65%)]" />
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00FF66] to-transparent" />
            </div>

            <div className="relative grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.9, delay: 0.15, ease }}
                className="relative mx-auto grid h-44 w-44 place-items-center sm:h-52 sm:w-52 md:h-60 md:w-60"
              >
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(0,255,102,0.28),rgba(0,217,255,0.1)_50%,transparent_72%)] blur-md" />
                <div className="pointer-events-none absolute inset-3 rounded-full border border-[#00FF66]/25" />
                <div className="pointer-events-none absolute inset-8 rounded-full border border-[#00D9FF]/20" />
                <Trophy tone="#00FF66" className="logo-float relative z-10 h-28 sm:h-32 md:h-40" />
              </motion.div>

              <div className="min-w-0 text-center md:text-left">
                <p className="hud-label mb-4 flex items-center justify-center gap-3 md:justify-start">
                  <span className="blink h-2 w-2 rounded-full bg-[#00FF66] shadow-[0_0_10px_#00FF66]" />
                  Exclusive award
                </p>
                <h2 className="display break-words text-[clamp(1.9rem,5vw,3.4rem)] leading-[1.05]">
                  <span aria-hidden>🏆</span> <span className="text-grad">Special Prize for First Year</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-sky-100/75 md:mx-0 md:text-lg">
                  A prize created exclusively for First Year participants and teams. If your squad is in its first year, this one is
                  all yours to win. Build boldly and show what a first-year team can ship.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
                  {['First Year Only', 'Special Award'].map((t) => (
                    <span key={t} className="rounded-full border border-[#00FF66]/30 bg-[#00FF66]/5 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-[#baffd4]">{t}</span>
                  ))}
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-400/5 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-cyan-200">For 1st Year Teams</span>
                </div>
                <div className="mt-8">
                  <MagneticButton to="/register" variant="solid">Register your team →</MagneticButton>
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  )
}
