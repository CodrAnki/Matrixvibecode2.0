import { ApiError } from '../middleware/errorHandler.js'

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PHONE_RE = /^[+]?[\d\s-]{10,15}$/
/**
 * Vibe Coding 2.0 is solo or duo: the team leader, plus at most one teammate. This is fixed by the
 * event format, deliberately NOT an admin setting — the old EventSettings.maxTeamSize is gone.
 */
export const MAX_TEAM_SIZE = 2
/**
 * Schema-level backstop for Team.members only, kept deliberately loose. Teams registered before the
 * solo/duo rule may still hold more members; a tight bound here would make those documents fail
 * validation on any later save (e.g. an admin changing their verification status). The real limit
 * is MAX_TEAM_SIZE, enforced in the controllers on registration and on adding a member.
 */
export const HARD_MAX_TEAM_SIZE = 20

export interface CleanMember { name: string; email?: string; phone?: string; year?: string }
export interface PersonKeys { email?: string | null; phone?: string | null }

/** Last 10 digits, so "+91 98765-43210" and "9876543210" compare equal. */
export const phoneKey = (v: string): string => v.replace(/\D/g, '').slice(-10)

const bad = (message: string, status = 400) => new ApiError(status, message, 'VALIDATION_ERROR')

function optionalText(v: unknown, label: string, max: number): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') throw bad(`${label} must be text`)
  const s = v.trim()
  if (!s) return undefined
  if (s.length > max) throw bad(`${label} must be ${max} characters or fewer`)
  return s
}

/** Validates ONE member object. Throws 400 on anything malformed. `requireEmail` is true for the add-member endpoint. */
export function parseMember(raw: unknown, index: number, opts: { requireEmail: boolean }): CleanMember {
  const label = `Member ${index + 1}`
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw bad(`${label} is malformed`)
  const o = raw as Record<string, unknown>

  if (typeof o.name !== 'string') throw bad(`${label}: name is required`)
  const name = o.name.trim()
  if (name.length < 2 || name.length > 100) throw bad(`${label}: name must be 2–100 characters`)

  const email = optionalText(o.email, `${label} email`, 254)?.toLowerCase()
  if (opts.requireEmail && !email) throw bad(`${label}: email is required`)
  if (email && !EMAIL_RE.test(email)) throw bad(`${label}: enter a valid email`)

  const phone = optionalText(o.phone, `${label} phone`, 20)
  if (phone && !PHONE_RE.test(phone)) throw bad(`${label}: enter a valid phone number`)

  const year = optionalText(o.year, `${label} year`, 30)

  return {
    name,
    ...(email && { email }),
    ...(phone && { phone }),
    ...(year && { year }),
  }
}

/** Throws if `candidate` repeats the leader or any person in `others` by email or phone. */
export function assertNoDuplicate(
  candidate: CleanMember,
  leader: PersonKeys,
  others: PersonKeys[],
  status: number,
  label = 'This member',
): void {
  const email = candidate.email?.toLowerCase()
  const phone = candidate.phone ? phoneKey(candidate.phone) : undefined
  if (email && leader.email && email === leader.email.toLowerCase()) throw bad(`${label}'s email belongs to the team leader`, status)
  if (phone && leader.phone && phone === phoneKey(leader.phone)) throw bad(`${label}'s phone number belongs to the team leader`, status)
  for (const o of others) {
    if (email && o.email && email === o.email.toLowerCase()) throw bad(`${label}'s email is already used by another member of this team`, status)
    if (phone && o.phone && phone === phoneKey(o.phone)) throw bad(`${label}'s phone number is already used by another member of this team`, status)
  }
}

/**
 * Registration-time `members` payload. Enforces: must be an array; at most (maxTeamSize - 1)
 * members, so leader + members never exceeds maxTeamSize; every entry well-formed; no duplicates
 * among themselves; the leader is never re-added as a member. Returns normalised members.
 */
export function parseMembersPayload(
  raw: unknown,
  opts: { maxTeamSize: number; leaderEmail: string; leaderPhone?: string },
): CleanMember[] {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) throw bad('members must be an array')
  const maxMembers = Math.max(0, opts.maxTeamSize - 1)
  if (raw.length > maxMembers) {
    throw bad(`A team can have at most ${maxMembers} member${maxMembers === 1 ? '' : 's'} besides the team leader (maximum team size is ${opts.maxTeamSize}, including the leader)`)
  }
  const out: CleanMember[] = []
  raw.forEach((entry, i) => {
    const member = parseMember(entry, i, { requireEmail: false })
    assertNoDuplicate(member, { email: opts.leaderEmail, phone: opts.leaderPhone }, out, 400, `Member ${i + 1}`)
    out.push(member)
  })
  return out
}
