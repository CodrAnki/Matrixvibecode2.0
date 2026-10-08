import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { Team } from '../models/Team.js'
import { User } from '../models/User.js'
import { CheckIn } from '../models/CheckIn.js'
import { EventSettings } from '../models/Event.js'
import { ApiError } from '../middleware/errorHandler.js'
import { issueTeamQrToken, verifyQrToken, ensureTeamQrToken } from '../services/qrService.js'

/** The admin "Check-in open" switch in Settings. It used to be stored and never read. */
async function assertCheckInOpen() {
  const s = await EventSettings.findOne().select('checkInOpen').lean()
  if (s?.checkInOpen !== true) {
    throw new ApiError(403, 'Check-in is closed. A Super Admin can open it in Settings.', 'CHECKIN_CLOSED')
  }
}
import { generateCheckInId } from '../utils/generateId.js'
import { serializeTeam, ACTIVE_TEAM_FILTER } from '../services/teamService.js'
import { parsePagination } from '../utils/pagination.js'
import { isDuplicateKeyError } from '../utils/dbErrors.js'

/** GET /api/teams/me/qr — team views its own (already-issued) QR check-in link. Does not mint a new one. */
export const getMyQr = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.auth?.id)
  const team = await Team.findById(user?.team)
  if (!team) throw new ApiError(404, 'Team not found', 'TEAM_NOT_FOUND')
  if (team.verificationStatus !== 'VERIFIED') throw new ApiError(400, 'QR codes are only issued to verified teams', 'TEAM_NOT_VERIFIED')
  // Idempotent: returns the existing live QR. Only mints one if the team has none at all (e.g. a
  // verified team whose token was somehow lost) — this never replaces a working QR, so it isn't
  // the "regenerate" that stays SUPER_ADMIN-only below.
  const qr = await ensureTeamQrToken(String(team._id))
  res.json({ success: true, teamId: team.teamId, checkedIn: team.checkedIn, qr })
})

/** GET /api/admin/teams/:teamId/qr — any admin can VIEW a verified team's current QR. Read-only. */
export const getTeamQrAdmin = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: req.params.teamId, ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found', 'TEAM_NOT_FOUND')
  if (team.verificationStatus !== 'VERIFIED') throw new ApiError(400, 'This team is not verified, so it has no QR code', 'TEAM_NOT_VERIFIED')
  const qr = await ensureTeamQrToken(String(team._id))
  res.json({ success: true, qr })
})

/**
 * QR regeneration is intentionally NOT exposed to team accounts. Per spec, one team = one
 * permanent QR; only SUPER_ADMIN may explicitly reissue one (see regenerateQr below, which is
 * mounted behind requireSuperAdmin in adminRoutes.ts). If a team's QR is genuinely compromised,
 * they must contact a SUPER_ADMIN.
 */

/** POST /api/admin/teams/:teamId/qr/regenerate — SUPER_ADMIN only. Invalidates the old token and issues a new one. */
export const regenerateQr = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: req.params.teamId, ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found', 'TEAM_NOT_FOUND')
  const qr = await issueTeamQrToken(String(team._id))
  res.json({ success: true, qr })
})

/**
 * POST /api/admin/qr/verify — Step 1 of check-in: staff scans, backend validates the token and
 * returns team details WITHOUT checking the team in (confirmation is a separate, explicit step).
 */
export const verifyQr = asyncHandler(async (req: Request, res: Response) => {
  const { teamId, token } = (req.body ?? {}) as { teamId?: unknown; token?: unknown }
  if (!teamId || !token) throw new ApiError(400, 'teamId and token are required')
  await assertCheckInOpen()

  const { team } = await verifyQrToken(teamId, token)
  const alreadyCheckedIn = await CheckIn.findOne({ team: team._id })
  if (alreadyCheckedIn || team.checkedIn) {
    res.json({ success: true, team: serializeTeam(team), alreadyCheckedIn: true, message: 'Team already checked in', code: 'ALREADY_CHECKED_IN' })
    return
  }
  res.json({ success: true, team: serializeTeam(team), alreadyCheckedIn: false })
})

/**
 * POST /api/admin/teams/:teamId/checkin — Step 2: explicit staff confirmation. Idempotent:
 * a duplicate scan/confirm never creates a second CheckIn record.
 */
export const confirmCheckIn = asyncHandler(async (req: Request, res: Response) => {
  await assertCheckInOpen()
  const team = await Team.findOne({ teamId: req.params.teamId, ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found', 'TEAM_NOT_FOUND')
  if (team.checkedIn) throw new ApiError(409, 'Team already checked in', 'ALREADY_CHECKED_IN')
  // This endpoint takes a bare teamId, not a QR token, so it has to re-check what the QR scan
  // step checks — otherwise an unverified or disabled team could be checked in by calling it directly.
  if (team.verificationStatus !== 'VERIFIED') throw new ApiError(403, 'Only verified teams can be checked in', 'TEAM_NOT_VERIFIED')
  if (team.disabled) throw new ApiError(403, 'This team has been disabled by an admin', 'TEAM_DISABLED')

  const body = (req.body ?? {}) as Record<string, unknown>
  const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)

  let checkIn
  try {
    // CheckIn.team is unique: of two simultaneous confirms, exactly one insert succeeds.
    checkIn = await CheckIn.create({
      checkInId: generateCheckInId(), team: team._id, scannedBy: req.auth?.id,
      location: text(body.location, 200), deviceInfo: text(body.deviceInfo, 300), checkedInAt: new Date(),
    })
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // Lost the race (or an earlier attempt wrote the CheckIn but not the team flag): self-heal the flag, report the conflict.
      const existing = await CheckIn.findOne({ team: team._id }).select('checkedInAt').lean()
      await Team.updateOne({ _id: team._id, checkedIn: { $ne: true } }, { checkedIn: true, checkedInAt: existing?.checkedInAt ?? new Date() })
      throw new ApiError(409, 'Team already checked in', 'ALREADY_CHECKED_IN')
    }
    throw err
  }
  team.checkedIn = true
  team.checkedInAt = checkIn.checkedInAt
  await team.save()

  res.status(201).json({ success: true, checkIn, team: serializeTeam(team), code: 'CHECKIN_SUCCESS' })
})

/** GET /api/admin/checkins?page=&limit= — newest first, paginated (default 25, max 100), active teams only. */
export const listCheckIns = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>)
  const [result] = await CheckIn.aggregate<{ rows: unknown[]; total: { n: number }[] }>([
    { $lookup: { from: Team.collection.name, localField: 'team', foreignField: '_id', as: 'teamDoc' } },
    { $unwind: '$teamDoc' },
    { $match: { 'teamDoc.isDeleted': { $ne: true } } },
    { $sort: { checkedInAt: -1 } },
    { $facet: {
      rows: [
        { $skip: skip }, { $limit: limit },
        { $lookup: { from: User.collection.name, localField: 'scannedBy', foreignField: '_id', as: 'scanner' } },
        { $project: {
          checkInId: 1, checkedInAt: 1, location: 1, deviceInfo: 1, createdAt: 1,
          team: { _id: '$teamDoc._id', teamId: '$teamDoc.teamId', teamName: '$teamDoc.teamName' },
          scannedBy: { $let: { vars: { s: { $arrayElemAt: ['$scanner', 0] } }, in: { _id: '$$s._id', name: '$$s.name', email: '$$s.email' } } },
        } },
      ],
      total: [{ $count: 'n' }],
    } },
  ])
  const total = result?.total[0]?.n ?? 0
  res.json({ success: true, checkIns: result?.rows ?? [], total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

/** GET /api/admin/checkins/:teamId */
export const getCheckInForTeam = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: req.params.teamId, ...ACTIVE_TEAM_FILTER })
  if (!team) throw new ApiError(404, 'Team not found', 'TEAM_NOT_FOUND')
  const checkIn = await CheckIn.findOne({ team: team._id })
  res.json({ success: true, checkIn })
})
