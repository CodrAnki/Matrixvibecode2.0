/** Shared shapes returned by the real backend (server/src/models). Mirrors serializeTeam. */
export interface Member {
  memberId: string; name: string; email?: string; phone?: string
  year?: string; status: 'ACTIVE' | 'REMOVED'
}
export interface VerificationHistoryEntry { status: string; note?: string; at: string }
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'CHANGES_REQUIRED'
export type EventStatus =
  | 'REGISTERED' | 'TEAM_FORMED' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'PROBLEM_SELECTED' | 'BUILDING'

export const TEAM_YEARS = ['1st Year'] as const
export type TeamYear = (typeof TEAM_YEARS)[number]

export interface Team {
  id: string
  teamId: string
  teamName: string
  teamYear?: TeamYear | null
  phone?: string
  members: Member[]
  verificationStatus: VerificationStatus
  verificationHistory: VerificationHistoryEntry[]
  eventStatus: EventStatus
  problemStatement?: string | { _id: string; title: string } | null
  checkedIn: boolean
  checkedInAt?: string
  disabled: boolean
  registrationStatus?: 'PENDING' | 'VERIFIED'
  isDeleted?: boolean
  deletedAt?: string
  deletedBy?: { name: string; email: string } | string | null
  isDummy?: boolean
  createdAt: string
  updatedAt: string
  leader?: { name: string; email: string; phone?: string }
}

export interface ProblemStatement {
  _id: string; problemId: string; title: string
  shortDescription?: string; description?: string
  category?: string; difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  constraints?: string; inputFormat?: string; outputFormat?: string
  sampleInput?: string; sampleOutput?: string; tags?: string[]
  isPublished: boolean; isDeleted?: boolean
  createdAt?: string; updatedAt?: string
}

export type AnnouncementType = 'GENERAL' | 'IMPORTANT' | 'DEADLINE' | 'SYSTEM'
export type AnnouncementPriority = 'NORMAL' | 'HIGH' | 'URGENT'
export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'
export interface Announcement {
  _id: string; title: string; message: string; type: AnnouncementType
  priority: AnnouncementPriority; status: AnnouncementStatus
  publishedAt?: string; expiresAt?: string
  createdAt: string; updatedAt?: string
}
