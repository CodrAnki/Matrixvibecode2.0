import { apiFetch } from '../lib/api'
import type { Team } from '../lib/types'

export const getMyTeam = () => apiFetch<{ team: Team }>('/teams/me').then((r) => r.team)
export const getMyTeamInfo = () => apiFetch<{ team: Team; maxTeamSize: number }>('/teams/me')
export const updateMyTeam = (patch: { phone?: string }) =>
  apiFetch<{ team: Team }>('/teams/me', { method: 'PUT', body: patch }).then((r) => r.team)

export const addMember = (teamId: string, member: { name: string; email: string; phone: string; year: string }) =>
  apiFetch<{ team: Team }>(`/teams/${teamId}/members`, { method: 'POST', body: member }).then((r) => r.team)

export const removeMember = (teamId: string, memberId: string) =>
  apiFetch<{ team: Team }>(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' }).then((r) => r.team)

export const selectProblem = (problemId: string) =>
  apiFetch<{ team: Team }>('/teams/me/problem', { method: 'POST', body: { problemId } }).then((r) => r.team)
