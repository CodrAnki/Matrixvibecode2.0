import type { HydratedDocument, Types } from 'mongoose'
import { Team, type TeamDoc } from '../models/Team.js'
import { User } from '../models/User.js'
import { EventSettings } from '../models/Event.js'
import { ApiError } from '../middleware/errorHandler.js'
import { resolveMaxTeamSize, type CleanMember } from '../utils/memberValidation.js'

/** The ONE definition of "active team". Every active-team query must spread/use this. */
export const ACTIVE_TEAM_FILTER = { isDeleted: { $ne: true } } as const

/** Escapes user input before it is placed in a RegExp (prevents regex injection / ReDoS). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** EventSettings.maxTeamSize (leader included). Falls back to 4 if the settings document is missing or invalid. */
export async function getMaxTeamSize(): Promise<number> {
  const settings = await EventSettings.findOne().select('maxTeamSize').lean()
  return resolveMaxTeamSize(settings?.maxTeamSize)
}

/** 409 if another team (soft-deleted ones included — their names stay reserved) already uses this name, case-insensitively. */
export async function assertTeamNameFree(teamName: string, exceptTeamId?: Types.ObjectId | unknown): Promise<void> {
  const taken = await Team.exists({
    teamName: new RegExp(`^${escapeRegex(teamName)}$`, 'i'),
    ...(exceptTeamId ? { _id: { $ne: exceptTeamId } } : {}),
  })
  if (taken) throw new ApiError(409, 'This team name is already taken')
}

/**
 * 409 if any of these people is already a member of another ACTIVE team, or already registered as
 * a team leader. One check, used by both registration and add-member so the two doors enforce the
 * same rule. Uses the Team.members.email and User.email indexes.
 */
export async function assertMembersAvailable(
  members: CleanMember[],
  except: { teamId?: Types.ObjectId | unknown; userId?: Types.ObjectId | unknown } = {},
): Promise<void> {
  const emails = members.map((m) => m.email).filter((e): e is string => !!e)
  if (!emails.length) return
  const elsewhere = await Team.exists({
    isDeleted: { $ne: true },
    'members.email': { $in: emails },
    ...(except.teamId ? { _id: { $ne: except.teamId } } : {}),
  })
  if (elsewhere) throw new ApiError(409, 'This person is already a member of another team')
  const otherLeader = await User.exists({
    email: { $in: emails },
    role: 'TEAM_LEADER',
    ...(except.userId ? { _id: { $ne: except.userId } } : {}),
  })
  if (otherLeader) throw new ApiError(409, 'This person is already registered as a team leader')
}

type Populated = { name?: string; email?: string; phone?: string } | null | undefined

/** Public-safe projection of a team, shared by team-facing and admin endpoints. */
export function serializeTeam(team: HydratedDocument<TeamDoc> & { _id: unknown }) {
  // `leader` is only an object when the query populated it; otherwise it's a bare ObjectId and
  // is omitted (never leak raw ids as if they were a leader profile).
  const rawLeader = team.leader as unknown as Populated & { _bsontype?: string }
  const leader = rawLeader && typeof rawLeader === 'object' && 'email' in rawLeader
    ? { name: rawLeader.name, email: rawLeader.email, phone: rawLeader.phone }
    : undefined
  return {
    id: team._id,
    teamId: team.teamId,
    teamName: team.teamName,
    leader,
    college: team.college,
    teamYear: team.teamYear ?? null,
    phone: team.phone,
    members: team.members,
    verificationStatus: team.verificationStatus,
    verificationHistory: team.verificationHistory,
    registrationStatus: team.registrationStatus,
    eventStatus: team.eventStatus,
    problemStatement: team.problemStatement,
    checkedIn: team.checkedIn,
    checkedInAt: team.checkedInAt,
    disabled: team.disabled,
    isDeleted: team.isDeleted,
    deletedAt: team.deletedAt,
    isDummy: team.isDummy,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  }
}
