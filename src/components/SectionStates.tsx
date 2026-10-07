import type { ReactNode } from 'react'

/** Placeholder rows shown while a homepage list loads. */
export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="border-t border-white/10" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-white/10 py-6">
          <div className="h-3 w-8 animate-pulse rounded bg-white/10" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-white/10" />
          <div className="ml-auto h-3 w-20 animate-pulse rounded bg-white/5" />
        </div>
      ))}
    </div>
  )
}

/** Empty / error message. `action` is an optional retry button. */
export function StateMessage({ tone = 'neutral', title, children, action }: { tone?: 'neutral' | 'error'; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`border-y py-10 ${tone === 'error' ? 'border-amber/40' : 'border-white/10'}`}>
      <p className={`font-display text-2xl font-bold tracking-tight ${tone === 'error' ? 'text-amber' : 'text-paper'}`}>{title}</p>
      {children && <p className="mt-2 max-w-xl text-silver">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
