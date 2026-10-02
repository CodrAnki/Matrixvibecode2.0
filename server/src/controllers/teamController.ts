import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { Team } from '../models/Team.js'
import { User } from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { serializeTeam, getMaxTeamSize, assertMembersAvailable } from '../services/teamService.js'
import { parseMember, assertNoDuplicate, PHONE_RE } from '../utils/memberValidation.js'
import { generateMemberId } from '../utils/generateId.js'

async function resolveOwnTeam(req: Request) {
  const user = await User.findById(req.auth?.id)
  if (!user?.team) throw new ApiError(404, 'No team linked to this account')
  const team = await Team.findById(user.team)
  if (!team) throw new ApiError(404, 'Team not found')
  return { user, team }
}

/** GET /api/teams/me */
export const getMyTeam = asyncHandler(async (req: Request, res: Response) => {
  const { team } = await resolveOwnTeam(req)
  res.json({ success: true, team: serializeTeam(team), maxTeamSize: await getMaxTeamSize() })
})

/** PUT /api/teams/me — leader-editable fields only (name/college/phone are locked after verification). */
export const updateMyTeam = asyncHandler(async (req: Request, res: Response) => {
  const { team } = await resolveOwnTeam(req)
  if (team.verificationStatus === 'VERIFIED') throw new ApiError(400, 'Verified teams cannot edit core details — contact an admin')
  const body = (req.body ?? {}) as Record<string, unknown>
  for (const k of ['college', 'phone'] as const) {
    if (body[k] !== undefined && body[k] !== null && typeof body[k] !== 'string') throw new ApiError(400, `${k} must be text`, 'VALIDATION_ERROR')
  }
  const college = typeof body.college === 'string' ? body.college.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (college && (college.length < 3 || college.length > 150)) throw new ApiError(400, 'College must be 3–150 characters', 'VALIDATION_ERROR')
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(400, 'Enter a valid phone number', 'VALIDATION_ERROR')
  if (college) team.college = college
  if (phone) team.phone = phone
  await team.save()
  res.json({ success: true, team: serializeTeam(team) })
})

/** GET /api/teams/:teamId — a team may only fetch its own record via this route. */
export const getTeamByTeamId = asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findOne({ teamId: String(req.params.teamId) })
  if (!team) throw new ApiError(404, 'Team not found')
  const user = await User.findById(req.auth?.id)
  if (String(user?.team) !== String(team._id)) throw new ApiError(403, 'You may only view your own team')
  res.json({ success: true, team: serializeTeam(team) })
})

/**
 * POST /api/teams/:teamId/members — leader adds a member to their own team's existing `members` array.
 * Never trusts the frontend: the size cap, lock and duplicate checks all run here, and the cap is
 * enforced INSIDE the database update (atomic), so two simultaneous requests can't both squeeze
 * past it.
 */
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const { user, team } = await resolveOwnTeam(req)
  if (user.role !== 'TEAM_LEADER') throw new ApiError(403, 'Only the team leader can add members')
  if (team.teamId !== req.params.teamId) throw new ApiError(403, 'You may only modify your own team')
  if (team.verificationStatus === 'VERIFIED') throw new ApiError(400, 'Your team is verified — roster changes must go through an admin')

  const maxSize = await getMaxTeamSize()
  const maxMembers = maxSize - 1 // the leader takes one slot
  if (team.members.length >= maxMembers) throw new ApiError(400, `Team size cannot exceed ${maxSize} (including leader)`)

  const member = parseMember(req.body, team.members.length, { requireEmail: true })
  // Leader / same-team duplicates are 409s (existing contract); then members of other teams and other leaders.
  assertNoDuplicate(member, { email: user.email, phone: team.phone ?? user.phone }, team.members.map((m) => ({ email: m.email, phone: m.phone })), 409, 'This person')
  await assertMembersAvailable([member], { teamId: team._id, userId: user._id })

  const updated = await Team.findOneAndUpdate(
    {
      _id: team._id, isDeleted: { $ne: true }, verificationStatus: { $ne: 'VERIFIED' },
      'members.email': { $ne: member.email },
      $expr: { $lt: [{ $size: { $ifNull: ['$members', []] } }, maxMembers] },
    },
    {
      $push: {
        members: {
          memberId: generateMemberId(), name: member.name, email: member.email, phone: member.phone,
          college: member.college ?? team.college ?? undefined, branch: member.branch,
          year: member.year ?? team.teamYear ?? undefined, status: 'ACTIVE',
        },
      },
    },
    { new: true, runValidators: true },
  )
  if (!updated) throw new ApiError(409, 'Could not add this member — the team may be full, locked, or already include this email')
  res.status(201).json({ success: true, team: serializeTeam(updated) })
})

/** DELETE /api/teams/:teamId/members/:memberId — leader only; blocked once the team is verified (same rule the UI shows). */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { user, team } = await resolveOwnTeam(req)
  if (user.role !== 'TEAM_LEADER') throw new ApiError(403, 'Only the team leader can remove members')
  if (team.teamId !== req.params.teamId) throw new ApiError(403, 'You may only modify your own team')
  if (team.verificationStatus === 'VERIFIED') throw new ApiError(400, 'Your team is verified — roster changes must go through an admin')
  const memberId = String(req.params.memberId)

  const result = await Team.updateOne({ _id: team._id, 'members.memberId': memberId }, { $pull: { members: { memberId } } })
  if (result.modifiedCount === 0) throw new ApiError(404, 'Member not found')
  const fresh = await Team.findById(team._id)
  if (!fresh) throw new ApiError(404, 'Team not found')
  res.json({ success: true, team: serializeTeam(fresh) })
})
