/** One set of labels/colours for a team's review status, shared by the team list and detail pages. */
export const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending review', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-200' },
  VERIFIED: { label: 'Verified', cls: 'border-[#38B878]/50 bg-[#38B878]/10 text-[#A9E7C4]' },
  CHANGES_REQUIRED: { label: 'Changes requested', cls: 'border-orange-400/40 bg-orange-400/10 text-orange-200' },
  REJECTED: { label: 'Rejected', cls: 'border-rose-400/40 bg-rose-400/10 text-rose-200' },
}
