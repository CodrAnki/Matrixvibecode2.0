import { useEffect, useState } from 'react'
import { EVENT_DATE } from '../data/event'

const pad = (n: number) => String(n).padStart(2, '0')

function diff(target: number) {
  const ms = Math.max(0, target - Date.now())
  const s = Math.floor(ms / 1000)
  return {
    done: ms <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  }
}

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

  if (t.done) {
    return (
      <div className="cd-panel cd-done text-center" role="status">
        <p className="hud-label mb-2">14 October 2026</p>
        <p className="display text-3xl text-glow md:text-5xl">Vibe Coding 2.0 Has Started!</p>
      </div>
    )
  }

  const units = [
    { label: 'Days', value: t.days },
    { label: 'Hours', value: t.hours },
    { label: 'Minutes', value: t.minutes },
    { label: 'Seconds', value: t.seconds },
  ]

  return (
    <div className="cd-panel" role="timer" aria-label={`${t.days} days, ${t.hours} hours, ${t.minutes} minutes, ${t.seconds} seconds until Vibe Coding 2.0`}>
      <p className="hud-label mb-4 flex items-center justify-center gap-3 text-center">
        <span className="blink h-2 w-2 rounded-full bg-[#C44552] shadow-[0_0_10px_#C44552]" />
        Event starts 14 October 2026
      </p>
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
