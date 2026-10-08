import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { Team } from '../models/Team.js'
import { User } from '../models/User.js'
import { ApiError } from '../middleware/errorHandler.js'
import { serializeTeam, assertMembersAvailable } from '../services/teamService.js'
import { parseMember, assertNoDuplicate, MAX_TEAM_SIZE, PHONE_RE } from '../utils/memberValidation.js'
import { generateMemberId } from '../utils/generateId.js'

async function resolveOwnTeam(req: Request) {
  const user = await User.findById(req.auth?.id)
  if (!user?.team) throw new ApiError(404, 'No team linked to this account')
  const team = await Team.findById(user.team)
  if (!team) throw new ApiError(404, 'Team not found')
  return { user, team }
}

const DISABLED = () => new ApiError(403, 'Your team has been disabled by an admin — contact support', 'TEAM_DISABLED')

/**
 * What a team's own edit does to its review status. CHANGES_REQUIRED → PENDING, because the edit
 * IS the resubmission the admin asked for; without this the team sat in "changes requested"
 * forever with no way back into the queue. (VERIFIED → PENDING is handled by addMember, the only
 * edit a verified team is allowed to make.)
 */
function resubmissionNote(status: string): string | null {
  return status === 'CHANGES_REQUIRED' ? 'Team updated its details — changes submitted for review' : null
}

/** GET /api/teams/me */
export const getMyTeam = asyncHandler(async (req: Request, res: Response) => {
  const { team } = await resolveOwnTeam(req)
  res.json({ success: true, team: serializeTeam(team), maxTeamSize: MAX_TEAM_SIZE })
})

/** PUT /api/teams/me — leader-editable fields only (phone is locked after verification). */
export const updateMyTeam = asyncHandler(async (req: Request, res: Response) => {
  const { user, team } = await resolveOwnTeam(req)
  if (team.disabled) throw DISABLED()
  if (team.verificationStatus === 'VERIFIED') throw new ApiError(400, 'Verified teams cannot edit core details — contact an admin')
  const body = (req.body ?? {}) as Record<string, unknown>
  if (body.phone !== undefined && body.phone !== null && typeof body.phone !== 'string') throw new ApiError(400, 'phone must be text', 'VALIDATION_ERROR')
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(400, 'Enter a valid phone number', 'VALIDATION_ERROR')
  if (phone && phone !== team.phone) {
    team.phone = phone
    const note = resubmissionNote(team.verificationStatus)
    if (note) {
      team.verificationStatus = 'PENDING'
      team.verificationHistory.push({ status: 'PENDING', note, by: user._id as never, at: new Date() })
    }
  }
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
  // Roster changes are allowed even after verification — adding someone after an admin has already
  // signed off just sends the team back to PENDING below, so the new roster gets reviewed too,
  // instead of either blocking the leader outright or silently keeping a stale approval. Once the
  // team has actually checked in at the venue, the event has started for them, so from there a
  // roster change goes through an admin instead.
  if (team.checkedIn) throw new ApiError(400, 'Your team has already checked in — roster changes must go through an admin')
  if (team.disabled) throw DISABLED()

  const maxMembers = MAX_TEAM_SIZE - 1 // the leader takes one slot
  if (team.members.length >= maxMembers) throw new ApiError(400, `Teams are solo or duo — at most ${MAX_TEAM_SIZE} people including the leader`)

  const member = parseMember(req.body, team.members.length, { requireEmail: true })
  // `year` isn't optional here, unlike at initial registration: this directly decides whether the
  // team still qualifies for the First Year special prize (see below), so a silently-blank answer
  // would leave that eligibility undefined. Only two honest answers exist for this event.
  // Phone is required for a teammate, same as on the registration form.
  if (!member.phone) throw new ApiError(400, "Enter your teammate's phone number", 'VALIDATION_ERROR')
  if (member.year !== '1st Year' && member.year !== 'Not 1st Year') {
    throw new ApiError(400, "Select whether this teammate is in their first year — it decides your team's First Year prize eligibility", 'VALIDATION_ERROR')
  }
  // Leader / same-team duplicates are 409s (existing contract); then members of other teams and other leaders.
  assertNoDuplicate(member, { email: user.email, phone: team.phone ?? user.phone }, team.members.map((m) => ({ email: m.email, phone: m.phone })), 409, 'This person')
  await assertMembersAvailable([member], { teamId: team._id, userId: user._id })

  const updated = await Team.findOneAndUpdate(
    {
      _id: team._id, isDeleted: { $ne: true }, checkedIn: { $ne: true },
      'members.email': { $ne: member.email },
      $expr: { $lt: [{ $size: { $ifNull: ['$members', []] } }, maxMembers] },
    },
    {
      $push: {
        members: {
          memberId: generateMemberId(), name: member.name, email: member.email, phone: member.phone,
          year: member.year, status: 'ACTIVE',
        },
      },
    },
    { new: true, runValidators: true },
  )
  if (!updated) throw new ApiError(409, 'Could not add this member — the team may be full, already checked in, or already include this email')

  // Two things a roster change can invalidate, checked against the freshly-updated doc:
  //  - a non-first-year teammate joining a team flagged "1st Year" breaks that claim — the flag is
  //    cleared rather than left stale, since nothing else in the app re-checks it later.
  //  - adding anyone after an admin already verified the team sends it back to PENDING, so the new
  //    roster gets reviewed too, instead of silently keeping an approval for a team that no longer
  //    matches what was approved.
  const losesFirstYear = member.year === 'Not 1st Year' && updated.teamYear === '1st Year'
  // VERIFIED → re-approval; CHANGES_REQUIRED → this addition is the resubmission. Either way the
  // team goes (back) to PENDING. PENDING stays PENDING; REJECTED stays REJECTED.
  const backToPending = updated.verificationStatus === 'VERIFIED' || updated.verificationStatus === 'CHANGES_REQUIRED'
  let final = updated
  if (losesFirstYear || backToPending) {
    const notes = [`Roster changed (added ${member.name})`]
    if (losesFirstYear) notes.push('no longer eligible for the First Year special prize')
    if (updated.verificationStatus === 'VERIFIED') notes.push('pending re-approval')
    if (updated.verificationStatus === 'CHANGES_REQUIRED') notes.push('changes submitted for review')
    const patched = await Team.findOneAndUpdate(
      { _id: updated._id },
      {
        $set: {
          ...(losesFirstYear && { teamYear: null }),
          ...(backToPending && { verificationStatus: 'PENDING' }),
          // Keep the event stage honest too — it shouldn't keep saying VERIFIED once the team isn't.
          ...(backToPending && updated.eventStatus === 'VERIFIED' && { eventStatus: 'VERIFICATION_PENDING' }),
        },
        $push: {
          verificationHistory: {
            status: backToPending ? 'PENDING' : updated.verificationStatus,
            note: notes.join(' — '),
            by: user._id,
            at: new Date(),
          },
        },
      },
      { new: true },
    )
    if (patched) final = patched
  }

  res.status(201).json({ success: true, team: serializeTeam(final) })
})

/** DELETE /api/teams/:teamId/members/:memberId — leader only; blocked once the team is verified (same rule the UI shows). */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { user, team } = await resolveOwnTeam(req)
  if (user.role !== 'TEAM_LEADER') throw new ApiError(403, 'Only the team leader can remove members')
  if (team.teamId !== req.params.teamId) throw new ApiError(403, 'You may only modify your own team')
  if (team.verificationStatus === 'VERIFIED') throw new ApiError(400, 'Your team is verified — roster changes must go through an admin')
  if (team.checkedIn) throw new ApiError(400, 'Your team has already checked in — roster changes must go through an admin')
  if (team.disabled) throw DISABLED()
  const memberId = String(req.params.memberId)

  const result = await Team.updateOne({ _id: team._id, 'members.memberId': memberId }, { $pull: { members: { memberId } } })
  if (result.modifiedCount === 0) throw new ApiError(404, 'Member not found')
  const fresh = await Team.findById(team._id)
  if (!fresh) throw new ApiError(404, 'Team not found')
  const note = resubmissionNote(fresh.verificationStatus)
  if (note) {
    fresh.verificationStatus = 'PENDING'
    fresh.verificationHistory.push({ status: 'PENDING', note, by: user._id as never, at: new Date() })
    await fresh.save()
  }
  res.json({ success: true, team: serializeTeam(fresh) })
})
