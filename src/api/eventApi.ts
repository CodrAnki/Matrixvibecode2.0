import { apiFetch } from '../lib/api'

export interface EventState {
  problemsRevealed: boolean
  problemsRevealedAt: string | null
  /** False once the event has started, or earlier if an admin switched registration off. */
  registrationOpen?: boolean
}

export interface AdminEventState extends EventState {
  publishedCount: number
  draftCount: number
}

export const getEventState = () => apiFetch<EventState>('/event/state')

export const getAdminEventState = () => apiFetch<AdminEventState>('/admin/event')

export const setProblemsRevealed = (revealed: boolean) =>
  apiFetch<EventState>('/admin/event/reveal', { method: 'PATCH', body: { revealed } })
