import type { ReactNode } from 'react'
import Reveal from './Reveal'

export default function SectionTitle({ kicker, title, sub, align = 'left', index }: { kicker: string; title: ReactNode; sub?: string; align?: 'left' | 'center'; index?: string }) {
  const centered = align === 'center'
  return (
    <Reveal className={`mb-12 max-w-3xl ${centered ? 'mx-auto text-center' : ''}`}>
      <div className={`mb-5 flex items-center gap-3 ${centered ? 'justify-center' : ''}`}>
        {index && <span className="font-mono text-[0.66rem] font-medium tracking-[0.2em] text-[#C44552]">{index}</span>}
        <span className="h-px w-8 bg-[#C44552]/45" />
        <span className="hud-label">{kicker}</span>
      </div>
      <h2 className="display text-[clamp(2.1rem,5vw,4.1rem)] text-[#F3F0E9]">{title}</h2>
      {sub && <p className={`mt-5 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg ${centered ? 'mx-auto' : ''}`}>{sub}</p>}
    </Reveal>
  )
}
