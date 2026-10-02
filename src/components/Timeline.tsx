import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { WORKFLOW } from '../data/event'

export default function Timeline() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 65%', 'end 55%'] })
  const [active, setActive] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setActive(Math.max(0, Math.min(WORKFLOW.length - 1, Math.floor(v * (WORKFLOW.length + 0.2))))))
  return (
    <div ref={ref} className="relative mx-auto max-w-4xl">
      <div className="absolute bottom-4 left-[19px] top-4 w-px bg-[#151B19] md:left-1/2 md:-translate-x-1/2" />
      <motion.div style={{ scaleY: scrollYProgress, originY: 0 }} className="absolute bottom-4 left-[19px] top-4 w-[2px] bg-gradient-to-b from-[#00FF66] to-[#00D9FF] shadow-[0_0_14px_#00FF66] md:left-1/2 md:-translate-x-1/2" />
      <ol className="space-y-10 md:space-y-14">
        {WORKFLOW.map((s, i) => {
          const on = i <= active
          const cur = i === active
          const left = i % 2 === 0
          return (
            <li key={s.title} className="relative flex items-start gap-6 md:gap-0">
              <button
                onClick={() => setActive(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border font-mono text-xs transition-all duration-500 md:absolute md:left-1/2 md:-translate-x-1/2 ${cur ? 'pulse-glow scale-125 border-[#6dffb0] bg-[#00FF66] text-void' : on ? 'border-[#00FF66]/70 bg-[#00FF66]/20 text-[#baffd4] shadow-[0_0_14px_#00FF6666]' : 'border-white/10 bg-deep text-[#4a544f]'}`}
              >
                {String(i + 1).padStart(2, '0')}
              </button>
              <div className={`md:w-1/2 ${left ? 'md:pr-16 md:text-right' : 'md:ml-auto md:pl-16'}`}>
                <div className={`glass holo-card p-5 transition-all duration-500 ${cur ? 'border-[#00FF66]/70 shadow-[0_0_50px_-10px_rgba(0,255,102,0.7)]' : on ? '' : 'opacity-60'}`}>
                  <h3 className={`font-mono text-sm tracking-[0.22em] ${cur ? 'text-glow' : on ? 'text-[#baffd4]' : 'text-slate-400'}`}>{s.title}</h3>
                  <p className="mt-2 text-sm text-sky-200/70">{s.text}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
