import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Team, VERIFICATION_STATUSES } from '../models/Team.js'
import { User } from '../models/User.js'
import { CheckIn } from '../models/CheckIn.js'
import { QRToken } from '../models/QRToken.js'
import { Otp } from '../models/Otp.js'
import { Announcement } from '../models/Announcement.js'
import { EventSettings } from '../models/Event.js'
import { ApiError } from '../middleware/errorHandler.js'
import { serializeTeam, ACTIVE_TEAM_FILTER, escapeRegex } from '../services/teamService.js'
import { ensureTeamQrToken } from '../services/qrService.js'
import { parsePagination, queryText } from '../utils/pagination.js'

/** GET /api/admin/settings — current event-wide settings (visible to ADMIN + SUPER_ADMIN). */
export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const settings = (await EventSettings.findOne()) ?? (await EventSettings.create({}))
  res.json({ success: true, settings })
})

/** PATCH /api/admin/settings — SUPER_ADMIN only (route-gated). Never trusts arbitrary fields from the body. */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const { name, maxTeamSize, registrationOpen, checkInOpen }: {
    name?: string; maxTeamSize?: number; registrationOpen?: boolean; checkInOpen?: boolean
  } = req.body ?? {}

  for (const [k, v] of [['registrationOpen', registrationOpen], ['checkInOpen', checkInOpen]] as const) {
    if (v !== undefined && typeof v !== 'boolean') throw new ApiError(400, `${k} must be true or false`)
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 150)) throw new ApiError(400, 'name must be 1–150 characters')

  const settings = (await EventSettings.findOne()) ?? (await EventSettings.create({}))
  if (name !== undefined) settings.name = name.trim()
  if (maxTeamSize !== undefined) {
    if (!Number.isInteger(maxTeamSize) || maxTeamSize < 1 || maxTeamSize > 20) throw new ApiError(400, 'maxTeamSize must be an integer between 1 and 20')
    settings.maxTeamSize = maxTeamSize
  }
  if (registrationOpen !== undefined) settings.registrationOpen = registrationOpen
  if (checkInOpen !== undefined) settings.checkInOpen = checkInOpen
  await settings.save()
  res.json({ success: true, settings })
})

/** GET /api/admin/teams?status=&q=&page=&limit= — always paginated (default 25, max 100). */
export const listTeams = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Record<string, unknown>
  const status = queryText(query.status, 30)
  const q = queryText(query.q)
  const { page, limit, skip } = parsePagination(query)

  const filter: Record<string, unknown> = { ...ACTIVE_TEAM_FILTER }
  if (status) {
    if (!(VERIFICATION_STATUSES as readonly string[]).includes(status)) throw new ApiError(400, `status must be one of ${VERIFICATION_STATUSES.join(', ')}`, 'VALIDATION_ERROR')
    filter.verificationStatus = status
  }
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ teamName: rx }, { teamId: rx }] }

  const [teams, total] = await Promise.all([
    Team.find(filter).populate('leader', 'name email phone').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Team.countDocuments(filter),
  ])

  res.json({ success: true, teams: teams.map(serializeTeam), total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

/** GET /api/admin/teams/:teamId — full detail incl. leader and check-in */
export const getTeamDetail = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: String(req.params.teamId), ...ACTIVE_TEAM_FILTER }).populate('leader', 'name email phone').populate('problemStatement')
  if (!team) throw new ApiError(404, 'Team not found')
  const checkIn = await CheckIn.findOne({ team: team._id })
  res.json({ success: true, team: { ...serializeTeam(team), problemStatement: team.problemStatement }, checkIn })
})

const MAX_VERIFICATION_HISTORY = 100 // bounds the per-team history array; real teams have a handful of entries
const PRE_VERIFIED_STAGES = ['REGISTERED', 'TEAM_FORMED', 'VERIFICATION_PENDING']

async function setVerification(req: Request, res: Response, status: 'VERIFIED' | 'REJECTED' | 'CHANGES_REQUIRED') {
  const team = await Team.findOne({ teamId: String(req.params.teamId), ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found')
  const rawNote = (req.body ?? {}).note
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') throw new ApiError(400, 'note must be text')
  const note = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim().slice(0, 500) : undefined

  team.verificationStatus = status
  team.verificationHistory.push({ status, note, by: req.auth?.id as never, at: new Date() })
  if (team.verificationHistory.length > MAX_VERIFICATION_HISTORY) team.verificationHistory.splice(0, team.verificationHistory.length - MAX_VERIFICATION_HISTORY)
  // Never move a team backwards (e.g. re-verifying must not reset PROBLEM_SELECTED / BUILDING to VERIFIED).
  if (status === 'VERIFIED' && PRE_VERIFIED_STAGES.includes(team.eventStatus)) team.eventStatus = 'VERIFIED'
  await team.save()

  // Idempotent: re-verifying keeps the QR the team already has instead of silently invalidating it.
  let qr: { url: string; expiresAt: Date } | null = null
  if (status === 'VERIFIED') qr = await ensureTeamQrToken(String(team._id))

  res.json({ success: true, team: serializeTeam(team), qr })
}

/** PATCH /api/admin/teams/:teamId/verify */
export const verifyTeam = asyncHandler((req, res) => setVerification(req, res, 'VERIFIED'))
/** PATCH /api/admin/teams/:teamId/reject */
export const rejectTeam = asyncHandler((req, res) => setVerification(req, res, 'REJECTED'))
/** PATCH /api/admin/teams/:teamId/request-changes */
export const requestChanges = asyncHandler((req, res) => setVerification(req, res, 'CHANGES_REQUIRED'))

/** PATCH /api/admin/teams/:teamId/disable */
export const disableTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: String(req.params.teamId), ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found')
  team.disabled = !team.disabled
  await team.save()
  res.json({ success: true, team: serializeTeam(team) })
})

/** DELETE /api/admin/teams/:teamId — soft delete. Moves the team to "Deleted Teams"; nothing is destroyed. */
export const deleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: String(req.params.teamId), ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found')

  team.isDeleted = true
  team.deletedAt = new Date()
  team.deletedBy = req.auth?.id as never
  await team.save()
  res.json({ success: true, team: serializeTeam(team) })
})

/** GET /api/admin/teams/deleted?page=&limit= — the "Deleted Teams" list (soft-deleted rows only), paginated. */
export const listDeletedTeams = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)
  const filter = { isDeleted: true }
  const [teams, total] = await Promise.all([
    Team.find(filter).populate('leader', 'name email phone').populate('deletedBy', 'name email').sort({ deletedAt: -1 }).skip(skip).limit(limit),
    Team.countDocuments(filter),
  ])
  res.json({
    success: true,
    teams: teams.map((t) => ({ ...serializeTeam(t), leader: t.leader, deletedBy: t.deletedBy })),
    total, page, pages: Math.max(1, Math.ceil(total / limit)),
  })
})

/** PATCH /api/admin/teams/:teamId/restore — reverses a soft delete exactly. */
export const restoreTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: String(req.params.teamId), isDeleted: true })
  if (!team) throw new ApiError(404, 'Deleted team not found')

  team.isDeleted = false
  team.deletedAt = null as never
  team.deletedBy = null as never
  await team.save()
  res.json({ success: true, team: serializeTeam(team) })
})

/**
 * DELETE /api/admin/teams/:teamId/permanent — ONLY on an already soft-deleted team, and only
 * with the exact confirmation phrase. Cascades to every record that actually references this
 * team (User leader account, its OTPs, QRToken and CheckIn) — nothing unrelated is touched.
 * Uses a transaction where the deployment supports one (see cleanupDummyTeams.ts for the same
 * pattern), falling back to sequential deletes on a standalone MongoDB.
 */
export const permanentDeleteTeam = asyncHandler(async (req: Request, res: Response) => {
  const { confirmText }: { confirmText?: string } = req.body
  if (confirmText !== 'DELETE TEAM') throw new ApiError(400, 'Type DELETE TEAM exactly to confirm permanent deletion')

  const team = await Team.findOne({ teamId: String(req.params.teamId), isDeleted: true })
  if (!team) throw new ApiError(404, 'This team must be in Deleted Teams before it can be permanently deleted')

  const runDeletes = async (session?: mongoose.ClientSession) => {
    const opts = session ? { session } : {}
    const qrTokensRemoved = (await QRToken.deleteMany({ team: team._id }, opts)).deletedCount ?? 0
    const checkInsRemoved = (await CheckIn.deleteMany({ team: team._id }, opts)).deletedCount ?? 0
    const otpsRemoved = (await Otp.deleteMany({ userId: team.leader }, opts)).deletedCount ?? 0
    const usersRemoved = (await User.deleteMany(
      { _id: team.leader, team: team._id, role: { $in: ['TEAM_LEADER', 'TEAM_MEMBER'] } },
      opts,
    )).deletedCount ?? 0
    await Team.deleteOne({ _id: team._id }, opts)
    return { qrTokensRemoved, checkInsRemoved, otpsRemoved, usersRemoved }
  }

  let result: Awaited<ReturnType<typeof runDeletes>> | null = null
  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => { result = await runDeletes(session) })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!/Transaction numbers are only allowed on a replica set|IllegalOperation|Transactions are not supported/i.test(message)) throw err
    result = await runDeletes()
  } finally {
    await session.endSession()
  }
  if (!result) throw new Error('Permanent delete produced no result — this should be unreachable')
  res.json({ success: true, ...result })
})

/**
 * DELETE /api/admin/teams/test — bulk soft delete, scoped EXACTLY to { isDummy: true }. Never a
 * bare deleteMany({}) — teams without isDummy explicitly set to true are never touched.
 */
export const deleteTestTeams = asyncHandler(async (req: Request, res: Response) => {
  const result = await Team.updateMany(
    { isDummy: true, isDeleted: { $ne: true } },
    { isDeleted: true, deletedAt: new Date(), deletedBy: req.auth?.id },
  )
  res.json({ success: true, deletedCount: result.modifiedCount ?? 0 })
})

/** GET /api/admin/dashboard — headline stats + chart data for the command-center overview. Every value is a live MongoDB query. */
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const activeFilter = ACTIVE_TEAM_FILTER
  const [
    totalTeams, verifiedTeams, pendingTeams, rejectedTeams, deletedTeams,
    checkedInTeams, registrationsByDay, collegeWise, problemSelection,
    publishedAnnouncements, totalAnnouncements, draftAnnouncements, latestAnnouncement, adminAccounts,
  ] = await Promise.all([
    Team.countDocuments(activeFilter),
    Team.countDocuments({ ...activeFilter, verificationStatus: 'VERIFIED' }),
    Team.countDocuments({ ...activeFilter, verificationStatus: 'PENDING' }),
    Team.countDocuments({ ...activeFilter, verificationStatus: 'REJECTED' }),
    Team.countDocuments({ isDeleted: true }),
    Team.countDocuments({ ...activeFilter, checkedIn: true }),
    Team.aggregate([{ $match: activeFilter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Team.aggregate([{ $match: activeFilter }, { $group: { _id: '$college', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    Team.aggregate([{ $match: { ...activeFilter, problemStatement: { $ne: null } } }, { $group: { _id: '$problemStatement', count: { $sum: 1 } } }]),
    Announcement.countDocuments({ status: 'PUBLISHED' }),
    Announcement.countDocuments(),
    Announcement.countDocuments({ status: 'DRAFT' }),
    Announcement.findOne().sort({ createdAt: -1 }).select('title status createdAt').lean(),
    User.countDocuments({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] }, active: true }),
  ])

  res.json({
    success: true,
    stats: {
      totalTeams, activeTeams: totalTeams, verifiedTeams, pendingTeams, rejectedTeams, deletedTeams,
      checkedInTeams, publishedAnnouncements, totalAnnouncements, draftAnnouncements, latestAnnouncement, adminAccounts,
    },
    charts: { registrationsByDay, collegeWise, problemSelection },
  })
})
