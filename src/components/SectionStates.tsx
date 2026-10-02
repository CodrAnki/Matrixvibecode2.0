import type { ReactNode } from 'react'

/** Placeholder cards (same footprint as HoloCard) shown while a homepage section loads. */
export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass relative min-h-[15rem] overflow-hidden p-6">
          <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
          <div className="mt-10 h-6 w-3/4 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-3 w-full animate-pulse rounded bg-white/5" />
          <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-white/5" />
          <span className="loader-bar absolute inset-x-0 bottom-0 h-px" />
        </div>
      ))}
    </div>
  )
}

/** Empty / error message panel. `action` is an optional retry button. */
export function StateMessage({ tone = 'neutral', title, children, action }: { tone?: 'neutral' | 'error'; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`glass hud-corners relative mx-auto max-w-xl p-8 text-center ${tone === 'error' ? '!border-rose-400/30' : ''}`}>
      <p className={`hud-label ${tone === 'error' ? '!text-rose-300' : ''}`}>{title}</p>
      {children && <p className="mt-3 text-sm leading-relaxed text-sky-100/65">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
