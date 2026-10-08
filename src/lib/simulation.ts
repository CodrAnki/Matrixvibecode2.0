import { useSyncExternalStore } from 'react'

/**
 * Admin testing simulation for the event-day flow. Stored in this browser only (localStorage), so an
 * admin can preview "event day" or "revealed" on the public site without any participant seeing it.
 * It is cosmetic by design: actual problem statements are only ever returned by the server, which
 * checks for an admin session before honouring a preview.
 */
export type SimPhase = 'auto' | 'countdown' | 'event-day' | 'revealed'
export interface Simulation {
  phase: SimPhase
  /** Preview the published problem statements in this browser before the official reveal. */
  showProblems: boolean
}

const KEY = 'matrix.vc2.simulation'
const OFF: Simulation = { phase: 'auto', showProblems: false }
const PHASES: SimPhase[] = ['auto', 'countdown', 'event-day', 'revealed']

function read(): Simulation {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return OFF
    const v = JSON.parse(raw) as Partial<Simulation>
    return {
      phase: PHASES.includes(v.phase as SimPhase) ? (v.phase as SimPhase) : 'auto',
      showProblems: v.showProblems === true,
    }
  } catch {
    return OFF
  }
}

let current = read()
const listeners = new Set<() => void>()
const refresh = () => {
  current = read()
  listeners.forEach((l) => l())
}
// Keeps an admin tab and a public-site tab in step.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) refresh()
})

export const isSimulating = (s: Simulation) => s.phase !== 'auto' || s.showProblems

export function setSimulation(next: Simulation) {
  try {
    if (isSimulating(next)) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage blocked: the simulation simply doesn't persist */
  }
  refresh()
}

export const clearSimulation = () => setSimulation(OFF)

export function useSimulation(): Simulation {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}
