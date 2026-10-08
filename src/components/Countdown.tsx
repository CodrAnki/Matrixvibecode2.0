import { useEffect, useMemo, useState } from 'react'
import { EVENT_DATE } from '../data/event'
import { useEventPhase } from '../lib/eventPhase'
import MagneticButton from './MagneticButton'

const pad = (n: number) => String(n).padStart(2, '0')

function diff(target: number) {
  const ms = Math.max(0, target - Date.now())
  const s = Math.floor(ms / 1000)
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

const PANEL = 'grid-surface relative rounded-[14px] border border-white/[0.08] p-6 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.8)] md:p-8'

function Ticker() {
  // Past the real date only a testing simulation can land here; give it a believable target.
  const target = useMemo(
    () => (EVENT_DATE.getTime() > Date.now() ? EVENT_DATE.getTime() : Date.now() + (2 * 86400 + 6 * 3600) * 1000),
    [],
  )
  const [t, setT] = useState(() => diff(target))
  useEffect(() => {
    const id = window.setInterval(() => setT(diff(target)), 1000)
    return () => window.clearInterval(id)
  }, [target])

  const units = [
    { label: 'Days', value: t.days },
    { label: 'Hours', value: t.hours },
    { label: 'Minutes', value: t.minutes },
    { label: 'Seconds', value: t.seconds },
  ]

  return (
    <div className="cd-panel grid-surface" role="timer" aria-label={`${t.days} days, ${t.hours} hours, ${t.minutes} minutes, ${t.seconds} seconds until Vibe Coding 2.0`}>
      <p className="hud-label mb-4 text-center">Event starts 14 October 2026</p>
      <div className="flex items-start justify-center gap-1.5 sm:gap-3 md:gap-4">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-start gap-1.5 sm:gap-3 md:gap-4">
            <div className="cd-cell">
              <span className="cd-num" aria-hidden="true">{pad(u.value)}</span>
              <span className="cd-label" aria-hidden="true">{u.label}</span>
            </div>
            {i < units.length - 1 && <span className="cd-sep" aria-hidden="true">:</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Event day, problems not revealed yet. The page checks for the reveal every 30s on its own. */
function EventDay() {
  return (
    <div className={PANEL} role="status" aria-live="polite">
      <p className="hud-label mb-4">14 October 2026 / Event day</p>
      <p className="display text-[clamp(1.9rem,4.4vw,3.1rem)] leading-[1.02] text-[#F3F0E9]">
        The wait is over. <span className="hl-green">It&apos;s event day.</span>
      </p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-base">
        Problem statements drop later today. Keep this page open; it updates the moment they go live.
      </p>
      <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.08] pt-4 font-mono text-[0.6rem] uppercase tracking-[0.2em]">
        <span className="text-slate-500">Problem statements</span>
        <span className="text-[#C44552]">Awaiting reveal</span>
      </p>
    </div>
  )
}

/**
 * Once problems are revealed this is the hero's main call to action: the hero drops its
 * Register / Explore buttons and shows this in their place, straight under the headline.
 */
export function ProblemsLive() {
  return (
    <div
      className={`${PANEL} overflow-hidden border-[#38B878]/35 shadow-[0_18px_44px_-24px_rgba(0,0,0,0.8),0_0_0_1px_rgba(56,184,120,0.08)]`}
      role="status"
      aria-live="polite"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-[#38B878]" />
      <p className="mb-4 flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-[0.26em] text-[#38B878]">
        <span className="h-2 w-2 rounded-full bg-[#38B878]" />
        14 October 2026 / Problem statements revealed
      </p>
      <p className="display text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.02] text-[#F3F0E9]">
        Problem statements are <span className="hl-green">live.</span>
      </p>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 md:text-lg">
        Read every brief, pick the challenge that fits your team and start building.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <MagneticButton to="/problems" variant="solid">
          View problem statements →
        </MagneticButton>
        <MagneticButton to="/support">Need help?</MagneticButton>
      </div>
    </div>
  )
}

/** Hero status before the reveal: countdown → "it's event day". After the reveal the hero shows
 *  `ProblemsLive` in place of its buttons instead (see Home). */
export default function Countdown() {
  const { phase } = useEventPhase()
  if (phase === 'revealed') return null
  if (phase === 'event-day') return <EventDay />
  return <Ticker />
}
