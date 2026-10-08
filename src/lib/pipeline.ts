import type { Team } from './types'

/**
 * Maps the backend's real verificationStatus/checkedIn onto the 3-stage Pipeline UI.
 * Returns how many stages are FULLY DONE (not which stage is "current") — Pipeline derives the
 * active stage from that. Registering a team is immediate and always done the moment the team
 * exists, so a brand-new PENDING team already has 1 stage complete (Registered), not 0 — otherwise
 * Registered itself renders as "in progress" for every team that has, in fact, already registered.
 */
export function pipelineStep(team: Pick<Team, 'verificationStatus' | 'checkedIn'>): number {
  if (team.checkedIn) return 3
  if (team.verificationStatus === 'VERIFIED') return 2
  return 1
}

/**
 * Overrides the current stage's "awaiting…" label when the team is blocked rather than waiting —
 * a rejected team is not "awaiting verification". Undefined means use the stage's default label.
 */
export function pipelineBlocked(team: Pick<Team, 'verificationStatus' | 'checkedIn' | 'disabled'>): string | undefined {
  if (team.checkedIn) return undefined
  if (team.disabled) return 'Team disabled'
  if (team.verificationStatus === 'CHANGES_REQUIRED') return 'Changes requested'
  if (team.verificationStatus === 'REJECTED') return 'Not approved'
  return undefined
}
