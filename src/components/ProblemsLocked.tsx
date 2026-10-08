import type { Phase } from '../lib/eventPhase'

/** A problem row with the title blacked out — the shape of what's coming, none of the content. */
export function RedactedRow({ n }: { n: number }) {
  return (
    <li className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-white/[0.12] py-6 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-8 sm:py-7" aria-hidden>
      <span className="pl-1 font-mono text-xs tracking-[0.18em] text-[#C44552]/60">PS-{String(n).padStart(2, '0')}</span>
      <span
        className="h-5 rounded-sm bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.09)_0_6px,rgba(255,255,255,0.03)_6px_12px)] sm:h-6"
        style={{ width: `${[62, 48, 56][(n - 1) % 3]}%` }}
      />
      <span className="rounded border border-white/15 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-slate-500">
        Sealed
      </span>
    </li>
  )
}

export function lockedCopy(phase: Phase) {
  return phase === 'event-day'
    ? {
        title: <>It&apos;s event day. <span className="hl-green">They drop soon.</span></>,
        text: 'The problem statements are revealed later today. This page updates on its own the moment they go live, so there is no need to refresh.',
      }
    : {
        title: <>Revealed on <span className="hl-green">event day.</span></>,
        text: 'The problem statements go live on 14 October 2026, the day of the event. Until then they stay sealed for every team.',
      }
}

/** Full-width sealed state for the /problems page. */
export default function ProblemsLocked({ phase }: { phase: Phase }) {
  const copy = lockedCopy(phase)
  return (
    <div className="grid-surface relative overflow-hidden rounded-[14px] border border-white/[0.08] p-6 md:p-10" role="status" aria-live="polite">
      <p className="mb-4 font-mono text-[0.65rem] uppercase tracking-[0.24em] text-[#C44552]">
        Sealed until the reveal
      </p>
      <h2 className="display text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.02] text-[#F3F0E9]">{copy.title}</h2>
      <p className="mt-4 max-w-xl leading-relaxed text-slate-400 md:text-lg">{copy.text}</p>
      <ol className="mt-8 border-t border-white/[0.12]">
        {[1, 2, 3].map((n) => <RedactedRow key={n} n={n} />)}
      </ol>
    </div>
  )
}
