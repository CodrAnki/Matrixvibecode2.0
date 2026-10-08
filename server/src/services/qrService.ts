import crypto from 'node:crypto'
import { QRToken } from '../models/QRToken.js'
import { Team } from '../models/Team.js'
import { ApiError } from '../middleware/errorHandler.js'
import { registrationClosesAt } from '../eventSchedule.js'

const TOKEN_TTL_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * A QR must work at the check-in desk on event day no matter how early the team was verified.
 * A flat 14-day TTL alone meant anyone verified more than two weeks out arrived with a dead code.
 * So every token is valid until at least 3 days after the event starts — applied when checking,
 * not just when issuing, so tokens already minted under the old rule (and already downloaded or
 * printed by teams) keep working without being reissued.
 */
function validUntil(storedExpiry: Date): number {
  const eventFloor = registrationClosesAt().getTime() + 3 * DAY_MS
  return Math.max(storedExpiry.getTime(), eventFloor)
}

/**
 * Issues a fresh QR token for a VERIFIED team, invalidating any previous active token.
 * The URL embeds only an unguessable random token (32 bytes) — no personal data. Verification looks
 * the token up by its SHA-256 hash. (The raw token is also kept, select:false, solely so the owning
 * team can re-display its own QR; see QRToken model.)
 */
export async function issueTeamQrToken(teamId: string): Promise<{ url: string; expiresAt: Date }> {
  const team = await Team.findById(teamId)
  if (!team) throw new ApiError(404, 'Team not found', 'TEAM_NOT_FOUND')
  if (team.verificationStatus !== 'VERIFIED') throw new ApiError(400, 'Team must be VERIFIED before a QR code can be issued', 'TEAM_NOT_VERIFIED')

  await QRToken.updateMany({ team: team._id, active: true }, { active: false })

  const raw = crypto.randomBytes(32).toString('base64url')
  const expiresAt = new Date(validUntil(new Date(Date.now() + TOKEN_TTL_DAYS * DAY_MS)))
  const doc = await QRToken.create({ team: team._id, tokenHash: hashToken(raw), rawToken: raw, expiresAt, active: true })

  team.qrTokenId = doc._id
  await team.save()

  const base = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'
  const url = `${base}/checkin/${team.teamId}?t=${raw}`
  return { url, expiresAt }
}

/** Re-derives a team's current active check-in URL, e.g. for their "Team QR" dashboard page. */
export async function getActiveTeamQrUrl(teamId: string): Promise<{ url: string; expiresAt: Date } | null> {
  const team = await Team.findById(teamId)
  if (!team) throw new ApiError(404, 'Team not found')
  const tokenDoc = await QRToken.findOne({ team: team._id, active: true }).sort({ createdAt: -1 }).select('+rawToken')
  if (!tokenDoc) return null
  const until = validUntil(tokenDoc.expiresAt)
  if (until < Date.now()) return null
  const base = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173'
  return { url: `${base}/checkin/${team.teamId}?t=${tokenDoc.rawToken}`, expiresAt: new Date(until) }
}

/**
 * Idempotent: returns the team's existing live QR, issuing one only if none exists. Used when a team
 * is (re-)verified, so repeated verify clicks never silently invalidate the QR the team already
 * downloaded or pile up duplicate token rows. Explicit reissue stays SUPER_ADMIN-only (issueTeamQrToken).
 */
export async function ensureTeamQrToken(teamId: string): Promise<{ url: string; expiresAt: Date }> {
  return (await getActiveTeamQrUrl(teamId)) ?? issueTeamQrToken(teamId)
}

const INVALID_QR = () => new ApiError(400, 'Invalid or expired QR code', 'INVALID_QR')

/**
 * Verifies a scanned (teamId, raw token) pair against the DB. Never trusts client-side QR contents
 * beyond this lookup. Malformed input is a clean 400, never a crash; every failure looks identical
 * (no hint whether the team id or the token was the wrong part). Looking the token up BY HASH also
 * keeps verification correct even if a concurrent reissue briefly left two active rows.
 */
export async function verifyQrToken(teamId: unknown, rawToken: unknown) {
  if (typeof teamId !== 'string' || typeof rawToken !== 'string' || !teamId || !rawToken || teamId.length > 40 || rawToken.length > 200) throw INVALID_QR()

  const tokenDoc = await QRToken.findOne({ tokenHash: hashToken(rawToken), active: true })
  if (!tokenDoc || validUntil(tokenDoc.expiresAt) < Date.now()) throw INVALID_QR()

  // Soft-deleted teams can never pass.
  const team = await Team.findOne({ _id: tokenDoc.team, teamId, isDeleted: { $ne: true } })
  if (!team) throw INVALID_QR()
  // A QR is only ever issued to a VERIFIED team; if the team was later rejected / sent back for changes, it stops working.
  if (team.verificationStatus !== 'VERIFIED') throw new ApiError(403, 'This team is not verified, so its QR code cannot be used', 'TEAM_NOT_VERIFIED')
  if (team.disabled) throw new ApiError(403, 'This team has been disabled by an admin, so its QR code cannot be used', 'TEAM_DISABLED')

  return { team, tokenDoc }
}
