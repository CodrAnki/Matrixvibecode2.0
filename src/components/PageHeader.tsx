import type { ReactNode } from 'react'

export default function PageHeader({ kicker, title, sub, right }: { kicker: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="hud-label">{kicker}</p>
        <h1 className="display mt-3 text-[clamp(2rem,4.5vw,3.4rem)] text-grad">{title}</h1>
        {sub && <p className="mt-3 max-w-xl text-sky-100/65">{sub}</p>}
      </div>
      {right}
    </div>
  )
}
