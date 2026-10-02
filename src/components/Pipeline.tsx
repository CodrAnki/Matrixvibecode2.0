import { motion } from 'framer-motion'

export const STAGES = [
  { key: 'REGISTERED', desc: 'Team registered on the platform' },
  { key: 'VERIFIED', desc: 'Details verified by organizers' },
  { key: 'CHECKED IN', desc: 'Checked in at the venue' },
]

export default function Pipeline({ completed, showDesc = false }: { completed: number; showDesc?: boolean }) {
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
                <span className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-[#151B19] md:hidden" />
                <span className="absolute left-1/2 top-[15px] hidden h-px w-full bg-[#151B19] md:block" />
                {done && (
                  <>
                    <motion.span initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.8, delay: i * 0.15 }} style={{ originY: 0 }} className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-[#00FF66] shadow-[0_0_8px_#00FF66] md:hidden" />
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: i * 0.15 }} style={{ originX: 0 }} className="absolute left-1/2 top-[15px] hidden h-px w-full bg-[#00FF66] shadow-[0_0_8px_#00FF66] md:block" />
                  </>
                )}
              </>
            )}
            <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center">
              {active && <span className="ping-ring absolute inset-0 rounded-full border border-[#00FF66]" />}
              <span className={`grid h-8 w-8 place-items-center rounded-full border font-mono text-[0.7rem] ${done ? 'border-[#6dffb0] bg-[#00FF66] text-void shadow-[0_0_18px_#00FF66]' : active ? 'pulse-glow border-[#00FF66]/70 bg-[#00FF66]/20 text-[#baffd4]' : 'border-white/10 bg-deep text-[#4a544f]'}`}>
                {done ? '✓' : i + 1}
              </span>
            </span>
            <span>
              <span className={`block font-mono text-[0.72rem] tracking-[0.2em] ${done || active ? 'text-cyan-200' : 'text-slate-500'}`}>{s.key}</span>
              {showDesc && <span className="mt-1 block text-xs text-sky-200/60">{s.desc}</span>}
              {active && <span className="mt-1 block font-mono text-[0.6rem] tracking-widest text-[#00FF66] blink">● IN PROGRESS</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
