import { motion } from 'framer-motion'
import { IconCheck } from './Icons'

export const STAGES = [
  { key: 'REGISTERED', desc: 'Team registered on the platform', awaiting: 'Registered' },
  { key: 'VERIFIED', desc: 'Details verified by organizers', awaiting: 'Awaiting verification' },
  { key: 'CHECKED IN', desc: 'Checked in at the venue', awaiting: 'Not checked in yet' },
]

/** `blocked` replaces the current stage's "awaiting…" label (and colours it as a problem) when the
 *  team isn't just waiting — see pipelineBlocked(). */
export default function Pipeline({ completed, showDesc = false, blocked }: { completed: number; showDesc?: boolean; blocked?: string }) {
  const stages = STAGES
  const done0 = completed
  return (
    <ol className="grid gap-7 md:grid-cols-3 md:gap-4">
      {stages.map((s, i) => {
        const done = i < done0
        const active = i === done0
        return (
          <li key={s.key} className="relative flex items-start gap-4 md:flex-col md:items-center md:gap-3 md:text-center">
            {i < stages.length - 1 && (
              <>
                <span className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-[#18181B] md:hidden" />
                <span className="absolute left-1/2 top-[15px] hidden h-px w-full bg-[#18181B] md:block" />
                {done && (
                  <>
                    <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: i * 0.15 }} style={{ originY: 0 }} className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-[#38B878] md:hidden" />
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: i * 0.15 }} style={{ originX: 0 }} className="absolute left-1/2 top-[15px] hidden h-px w-full bg-[#38B878] md:block" />
                  </>
                )}
              </>
            )}
            <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center">
              {active && <span className="ping-ring absolute inset-0 rounded-full border border-[#38B878]" />}
              <span className={`grid h-8 w-8 place-items-center rounded-full border font-mono text-[0.7rem] ${done ? 'border-[#70D6A2] bg-[#38B878] text-[#07110B]' : active ? 'border-[#38B878]/70 bg-[#38B878]/15 text-[#A9E7C4]' : 'border-white/10 bg-deep text-[#4a544f]'}`}>
                {done ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
              </span>
            </span>
            <span>
              <span className={`block font-mono text-[0.72rem] tracking-[0.2em] ${done || active ? 'text-[#A9E7C4]' : 'text-slate-500'}`}>{s.key}</span>
              {showDesc && <span className="mt-1 block text-xs text-slate-400">{s.desc}</span>}
              {/* "Awaiting…" rather than "In progress": check-in and verification are both things
                  that simply haven't happened yet, not something underway right now. */}
              {active && (blocked
                ? <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-widest text-orange-300">● {blocked}</span>
                : <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-widest text-[#38B878]">● {s.awaiting}</span>)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
