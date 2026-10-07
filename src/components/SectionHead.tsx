import type { ReactNode } from 'react'
import Reveal from './Reveal'

/** Section opener: index + label on a thin rule, then a controlled display heading. Used by every home section. */
export default function SectionHead({ index, label, title, children }: { index: string; label: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mb-12 md:mb-16">
      <div className="mb-8 flex items-center justify-between border-t border-white/15 pt-3">
        <span className="meta">{index} / {label}</span>
        <span className="meta hidden sm:inline">Vibe Coding 2.0 / MATRIX JEC</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <h2 className="display text-[clamp(2.4rem,6vw,5rem)] text-paper">{title}</h2>
        {children && <p className="max-w-md text-base leading-relaxed text-silver lg:justify-self-end">{children}</p>}
      </div>
    </Reveal>
  )
}
