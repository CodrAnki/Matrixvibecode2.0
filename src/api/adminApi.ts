import { apiFetch } from '../lib/api'
import type { Team, ProblemStatement, Announcement } from '../lib/types'

export interface DashboardStats {
  totalTeams: number; verifiedTeams: number; pendingTeams: number; rejectedTeams: number
  changesRequestedTeams: number; deletedTeams: number; checkedInTeams: number
  publishedAnnouncements: number; totalAnnouncements: number; draftAnnouncements: number;
  latestAnnouncement: { _id: string; title: string; status: string; createdAt: string } | null; adminAccounts: number; activeTeams: number
}
export interface DashboardCharts {
  registrationsByDay: { _id: string; count: number }[]
  teamSize: { _id: string; count: number }[]
  problemSelection: { _id: string; count: number }[]
}
export const getDashboard = () => apiFetch<{ stats: DashboardStats; charts: DashboardCharts }>('/admin/dashboard')

export const listTeams = (params: { status?: string; q?: string; page?: number } = {}) => {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.q) qs.set('q', params.q)
  if (params.page) qs.set('page', String(params.page))
  const suffix = qs.toString() ? `?${qs}` : ''
  return apiFetch<{ teams: Team[]; total: number; page: number; pages: number }>(`/admin/teams${suffix}`)
}
export const getTeamDetail = (teamId: string) => apiFetch<{ team: Team & { leader?: unknown }; checkIn: unknown }>(`/admin/teams/${teamId}`)
export const verifyTeam = (teamId: string, note?: string) => apiFetch<{ team: Team; qr: { url: string } | null }>(`/admin/teams/${teamId}/verify`, { method: 'PATCH', body: { note } })
export const rejectTeam = (teamId: string, note?: string) => apiFetch<{ team: Team }>(`/admin/teams/${teamId}/reject`, { method: 'PATCH', body: { note } })
export const requestChanges = (teamId: string, note?: string) => apiFetch<{ team: Team }>(`/admin/teams/${teamId}/request-changes`, { method: 'PATCH', body: { note } })
export const disableTeam = (teamId: string) => apiFetch<{ team: Team }>(`/admin/teams/${teamId}/disable`, { method: 'PATCH' })
export const deleteTeam = (teamId: string) => apiFetch<{ team: Team }>(`/admin/teams/${teamId}`, { method: 'DELETE' })
export const listDeletedTeams = (page = 1) => apiFetch<{ teams: Team[]; total: number; page: number; pages: number }>(`/admin/teams/deleted?page=${page}`)
export const restoreTeam = (teamId: string) => apiFetch<{ team: Team }>(`/admin/teams/${teamId}/restore`, { method: 'PATCH' })
export const permanentDeleteTeam = (teamId: string, confirmText: string) =>
  apiFetch<{ qrTokensRemoved: number; checkInsRemoved: number; otpsRemoved: number; usersRemoved: number }>(
    `/admin/teams/${teamId}/permanent`, { method: 'DELETE', body: { confirmText } },
  )
export const deleteTestTeams = () => apiFetch<{ deletedCount: number }>('/admin/teams/test', { method: 'DELETE' })
/** View-only: the team's current QR. Never invalidates anything (unlike regenerateQr). */
export const getTeamQr = (teamId: string) => apiFetch<{ qr: { url: string; expiresAt: string } }>(`/admin/teams/${teamId}/qr`)
export const regenerateQr = (teamId: string) => apiFetch<{ qr: { url: string; expiresAt: string } }>(`/admin/teams/${teamId}/qr/regenerate`, { method: 'POST' })

export const listProblemsAdmin = () => apiFetch<{ problems: ProblemStatement[] }>('/admin/problems')
export const getProblemAdmin = (id: string) => apiFetch<{ problem: ProblemStatement }>(`/admin/problems/${id}`).then((r) => r.problem)
export const createProblem = (input: Partial<ProblemStatement>) => apiFetch<{ problem: ProblemStatement }>('/admin/problems', { method: 'POST', body: input })
export const updateProblem = (id: string, input: Partial<ProblemStatement>) => apiFetch<{ problem: ProblemStatement }>(`/admin/problems/${id}`, { method: 'PUT', body: input })
export const publishProblem = (id: string) => apiFetch<{ problem: ProblemStatement }>(`/admin/problems/${id}/publish`, { method: 'PATCH' })
export const unpublishProblem = (id: string) => apiFetch<{ problem: ProblemStatement }>(`/admin/problems/${id}/unpublish`, { method: 'PATCH' })
export const deleteProblem = (id: string) => apiFetch<{ referencedByTeams: number }>(`/admin/problems/${id}`, { method: 'DELETE' })

export interface AdminAccount { id: string; name: string; email: string; phone: string; role: 'ADMIN' | 'SUPER_ADMIN'; active: boolean; createdAt: string }
export const listAdminAccounts = () => apiFetch<{ accounts: AdminAccount[]; superAdminCreationEnabled: boolean }>('/admin/accounts')
export const createAdminAccount = (input: { name: string; email: string; phone?: string; password: string; confirmPassword: string; role: string }) =>
  apiFetch<{ message: string; account: AdminAccount }>('/admin/accounts', { method: 'POST', body: input })
export const updateAdminAccount = (id: string, input: { name?: string; phone?: string; active?: boolean; role?: string; password?: string; confirmPassword?: string }) =>
  apiFetch<{ message: string; account: AdminAccount }>(`/admin/accounts/${id}`, { method: 'PATCH', body: input })
export const deleteAdminAccount = (id: string) => apiFetch<{ message: string }>(`/admin/accounts/${id}`, { method: 'DELETE' })

export interface AnnouncementInput {
  title: string; message: string; type: Announcement['type']; priority: Announcement['priority']
  status?: 'DRAFT' | 'PUBLISHED'; publishedAt?: string | null; expiresAt?: string | null
}
export const listAnnouncementsAdmin = (params: { q?: string; status?: string; type?: string; priority?: string } = {}) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()
  return apiFetch<{ announcements: Announcement[] }>(`/admin/announcements${qs ? `?${qs}` : ''}`)
}
export const createAnnouncement = (input: AnnouncementInput) => apiFetch<{ announcement: Announcement }>('/admin/announcements', { method: 'POST', body: input })
export const updateAnnouncement = (id: string, input: Partial<AnnouncementInput>) => apiFetch<{ announcement: Announcement }>(`/admin/announcements/${id}`, { method: 'PUT', body: input })
export const publishAnnouncement = (id: string) => apiFetch<{ announcement: Announcement }>(`/admin/announcements/${id}/publish`, { method: 'PATCH' })
export const unpublishAnnouncement = (id: string) => apiFetch<{ announcement: Announcement }>(`/admin/announcements/${id}/unpublish`, { method: 'PATCH' })
export const deleteAnnouncement = (id: string) => apiFetch(`/admin/announcements/${id}`, { method: 'DELETE' })

export const verifyQrScan = (teamId: string, token: string) => apiFetch<{ team: Team; alreadyCheckedIn: boolean; message?: string }>('/admin/qr/verify', { method: 'POST', body: { teamId, token } })
export const confirmCheckIn = (teamId: string, extra: { location?: string; deviceInfo?: string } = {}) => apiFetch<{ checkIn: unknown; team: Team }>(`/admin/teams/${teamId}/checkin`, { method: 'POST', body: extra })
export const listCheckIns = (params: { page?: number; limit?: number } = {}) => apiFetch<{ checkIns: unknown[]; total: number; page: number; pages: number }>(`/admin/checkins?page=${params.page ?? 1}&limit=${params.limit ?? 50}`)

// Team size is not here on purpose: solo/duo is fixed in the backend, not an admin setting.
export const getSettings = () => apiFetch<{ settings: { name: string; registrationOpen: boolean; checkInOpen: boolean } }>('/admin/settings').then((r) => r.settings)
export const updateSettings = (input: { name?: string; registrationOpen?: boolean; checkInOpen?: boolean }) =>
  apiFetch<{ settings: unknown }>('/admin/settings', { method: 'PATCH', body: input })
