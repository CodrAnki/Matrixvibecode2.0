import type { Team } from './types'

/** Maps the backend's real verificationStatus/checkedIn onto the 3-stage Pipeline UI. */
export function pipelineStep(team: Pick<Team, 'verificationStatus' | 'checkedIn'>): number {
  if (team.checkedIn) return 3
  if (team.verificationStatus === 'VERIFIED') return 1
  return 0
}
