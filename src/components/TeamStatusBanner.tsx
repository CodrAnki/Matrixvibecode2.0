import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Team } from '../lib/types'

/** Human label for a review status — the raw enum ("CHANGES_REQUIRED") was shown to teams as-is. */
export const TEAM_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending review',
  VERIFIED: 'Verified',
  CHANGES_REQUIRED: 'Changes requested',
  REJECTED: 'Rejected',
}

/**
 * The admin's note on the decision that put the team in its current status, if they left one.
 * Only admin decisions count: PENDING entries are written by the system (e.g. "changes submitted
 * for review"), so they must not be shown as a note from the organisers.
 */
function latestNote(team: Team): string | undefined {
  if (team.verificationStatus === 'PENDING') return undefined
  const hist = team.verificationHistory ?? []
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].status === team.verificationStatus) return hist[i].note || undefined
  }
  return undefined
}

const TONE = {
  info: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  warn: 'border-orange-400/40 bg-orange-500/10 text-orange-100',
  bad: 'border-rose-400/40 bg-rose-500/10 text-rose-100',
  good: 'border-[#38B878]/40 bg-[#38B878]/10 text-[#D7F5E5]',
}

/**
 * What the team should know (and do) right now, given its review status. Before this, a team sent
 * back for changes saw only "CHANGES_REQUIRED" with no idea what to change or how to resubmit.
 */
export default function TeamStatusBanner({ team }: { team: Team }) {
  const note = latestNote(team)
  let tone: keyof typeof TONE
  let title: string
  let body: ReactNode

  if (team.disabled) {
    tone = 'bad'; title = 'Your team has been disabled'
    body = <>An admin has disabled your team, so it can’t check in or make changes. <Link to="/dashboard/support" className="underline">Contact support</Link> if you think this is a mistake.</>
  } else if (team.checkedIn) {
    tone = 'good'; title = 'You’re checked in'
    body = <>Welcome to Vibe Coding 2.0. Watch the announcements for when problem statements go live.</>
  } else if (team.verificationStatus === 'VERIFIED') {
    tone = 'good'; title = 'Your team is verified'
    body = <>Bring your <Link to="/dashboard/qr" className="underline">team QR</Link> to the check-in desk on event day.</>
  } else if (team.verificationStatus === 'CHANGES_REQUIRED') {
    tone = 'warn'; title = 'An admin has requested changes'
    body = <>Update your team on <Link to="/dashboard/team" className="underline">My Team</Link> — saving a change sends it back for review automatically. Stuck? <Link to="/dashboard/support" className="underline">Contact support</Link>.</>
  } else if (team.verificationStatus === 'REJECTED') {
    tone = 'bad'; title = 'Your registration was not approved'
    body = <>If you think this is a mistake, <Link to="/dashboard/support" className="underline">contact support</Link>.</>
  } else {
    tone = 'info'; title = 'Your team is under review'
    body = <>An admin will verify your team before the event. Your check-in QR appears here once you’re verified.</>
  }

  return (
    <section role="status" className={`mb-6 rounded-xl border px-5 py-4 ${TONE[tone]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-90">{body}</p>
      {note && !team.disabled && (
        <p className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
          <span className="mb-0.5 block font-mono text-[0.58rem] uppercase tracking-widest opacity-70">Note from the organisers</span>
          {note}
        </p>
      )}
    </section>
  )
}
