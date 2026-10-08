import { useEffect, useState, useSyncExternalStore } from 'react'
import { getEventState } from '../api/eventApi'
import { EVENT_DATE } from '../data/event'
import { isSimulating, useSimulation } from './simulation'

export type Phase = 'countdown' | 'event-day' | 'revealed'

const POLL_MS = 30_000

// Server reveal state, shared by every component that asks.
let server = { revealed: false, registrationOpen: true, loaded: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
let inflight: Promise<void> | null = null

export function refreshEventState(): Promise<void> {
  inflight ??= getEventState()
    .then((r) => {
      const registrationOpen = r.registrationOpen !== false
      if (!server.loaded || r.problemsRevealed !== server.revealed || registrationOpen !== server.registrationOpen) {
        server = { revealed: r.problemsRevealed, registrationOpen, loaded: true }
        emit()
      }
    })
    .catch(() => {
      // Keep the last known state and let the next poll retry. On a first-load failure, settle on
      // "not revealed" so problem sections show their sealed state instead of loading forever.
      if (!server.loaded) {
        server = { ...server, revealed: false, loaded: true }
        emit()
      }
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

// One shared poller, however many components are waiting on the reveal.
let pollers = 0
let pollTimer: number | undefined
const onVisible = () => {
  if (document.visibilityState === 'visible') void refreshEventState()
}
function startPolling() {
  if (pollers++ > 0) return
  pollTimer = window.setInterval(() => void refreshEventState(), POLL_MS)
  document.addEventListener('visibilitychange', onVisible)
}
function stopPolling() {
  if (--pollers > 0) return
  window.clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', onVisible)
}

/** Flips true at midnight IST on event day, without re-rendering every second to find out. */
function useEventDayReached() {
  const [now, setNow] = useState(() => Date.now())
  const reached = now >= EVENT_DATE.getTime()
  useEffect(() => {
    if (reached) return
    // setTimeout overflows past ~24.8 days, so re-arm in at most one-day steps.
    const ms = Math.min(EVENT_DATE.getTime() - Date.now() + 50, 86_400_000)
    const t = window.setTimeout(() => setNow(Date.now()), Math.max(ms, 0))
    const wake = () => setNow(Date.now())
    document.addEventListener('visibilitychange', wake)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [now, reached])
  return reached
}

/**
 * Where the event is: counting down, event day (awaiting the reveal), or problems revealed — plus
 * whether this browser should show the problem statements. A testing simulation, when set, wins
 * over the real state so an admin sees exactly what that phase looks like.
 */
export function useEventPhase() {
  const state = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => server,
  )
  const sim = useSimulation()
  const dayReached = useEventDayReached()
  const simulated = isSimulating(sim)

  useEffect(() => {
    if (!server.loaded) void refreshEventState()
  }, [])

  // Only poll while a reveal can actually arrive: event day reached and not revealed yet.
  const awaitingReveal = dayReached && !state.revealed
  useEffect(() => {
    if (!awaitingReveal) return
    startPolling()
    return stopPolling
  }, [awaitingReveal])

  const realPhase: Phase = state.revealed ? 'revealed' : dayReached ? 'event-day' : 'countdown'
  const phase: Phase = sim.phase === 'auto' ? realPhase : sim.phase
  const problemsVisible = simulated ? sim.showProblems || phase === 'revealed' : state.revealed
  // Registrations close when the countdown hits zero (or earlier, by the admin switch). Follows the
  // simulated phase too, so testing "event day" shows the site exactly as it will look then.
  const registrationOpen = phase === 'countdown' && state.registrationOpen

  return { phase, realPhase, problemsVisible, registrationOpen, simulated, loaded: state.loaded }
}

/** Shorthand for components that only need to know whether to offer registration. */
export const useRegistrationOpen = () => useEventPhase().registrationOpen
