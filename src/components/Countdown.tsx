import { useEffect, useState } from 'react'
import { EVENT_DATE } from '../data/event'

const pad = (n: number) => String(n).padStart(2, '0')

function diff(target: number) {
  const ms = Math.max(0, target - Date.now())
  const s = Math.floor(ms / 1000)
  return { done: ms <= 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 }
}

/** Plain typographic countdown: four numerals separated by thin rules. No panel, no glow. */
export default function Countdown() {
  const target = EVENT_DATE.getTime()
  const [t, setT] = useState(() => diff(target))

  useEffect(() => {
    setT(diff(target))
    const id = window.setInterval(() => {
      const next = diff(target)
      setT(next)
      if (next.done) window.clearInterval(id)
    }, 1000)
    return () => window.clearInterval(id)
  }, [target])

  if (t.done) return <p className="display text-3xl text-paper md:text-4xl" role="status">Vibe Coding 2.0 is on.</p>

  const units = [
    { label: 'Days', value: t.days },
    { label: 'Hrs', value: t.hours },
    { label: 'Min', value: t.minutes },
    { label: 'Sec', value: t.seconds },
  ]
  return (
    <div role="timer" aria-label={`${t.days} days, ${t.hours} hours, ${t.minutes} minutes, ${t.seconds} seconds until Vibe Coding 2.0`} className="flex items-stretch">
      {units.map((u, i) => (
        <div key={u.label} aria-hidden="true" className={`pr-4 sm:pr-6 ${i > 0 ? 'border-l border-white/15 pl-4 sm:pl-6' : ''}`}>
          <div className="cd-num text-[clamp(1.7rem,6vw,2.6rem)] text-paper">{pad(u.value)}</div>
          <div className="meta mt-1.5 !text-[0.6rem]">{u.label}</div>
        </div>
      ))}
    </div>
  )
}
