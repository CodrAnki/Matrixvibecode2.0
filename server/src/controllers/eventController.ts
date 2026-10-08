import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { EventSettings } from '../models/Event.js'
import { ProblemStatement } from '../models/ProblemStatement.js'
import { ApiError } from '../middleware/errorHandler.js'
import { isRegistrationOpen } from '../eventSchedule.js'

const settingsDoc = async () => (await EventSettings.findOne()) ?? (await EventSettings.create({}))

const ACTIVE = { isDeleted: { $ne: true } }

/**
 * GET /api/event/state — public, and polled by the site every 30s on event day so the hero flips to
 * "revealed" without a reload. Never cached: a stale "not revealed" would hide the problems.
 */
export const getEventState = asyncHandler(async (_req: Request, res: Response) => {
  const s = await EventSettings.findOne().lean()
  res.set('Cache-Control', 'no-store')
  res.json({
    success: true,
    problemsRevealed: s?.problemsRevealed === true,
    problemsRevealedAt: s?.problemsRevealedAt ?? null,
    registrationOpen: isRegistrationOpen(s),
  })
})

/** GET /api/admin/event — reveal state plus how many problems the reveal would expose. */
export const getAdminEventState = asyncHandler(async (_req: Request, res: Response) => {
  const s = await settingsDoc()
  const [publishedCount, draftCount] = await Promise.all([
    ProblemStatement.countDocuments({ ...ACTIVE, isPublished: true }),
    ProblemStatement.countDocuments({ ...ACTIVE, isPublished: { $ne: true } }),
  ])
  res.json({
    success: true,
    problemsRevealed: s.problemsRevealed,
    problemsRevealedAt: s.problemsRevealedAt,
    publishedCount,
    draftCount,
  })
})

/**
 * PATCH /api/admin/event/reveal { revealed } — the official switch. Revealing makes every published
 * problem statement public at once; hiding pulls them back. Refuses to reveal an empty set, which
 * would announce "problems are live" to participants over an empty page.
 */
export const setProblemsRevealed = asyncHandler(async (req: Request, res: Response) => {
  const { revealed } = (req.body ?? {}) as { revealed?: unknown }
  if (typeof revealed !== 'boolean') throw new ApiError(400, 'revealed must be true or false')

  if (revealed) {
    const published = await ProblemStatement.countDocuments({ ...ACTIVE, isPublished: true })
    if (published === 0) {
      throw new ApiError(400, 'Publish at least one problem statement before revealing.', 'NOTHING_TO_REVEAL')
    }
  }

  const s = await settingsDoc()
  if (s.problemsRevealed !== revealed) {
    s.problemsRevealed = revealed
    s.problemsRevealedAt = revealed ? new Date() : null
    await s.save()
  }
  res.json({ success: true, problemsRevealed: s.problemsRevealed, problemsRevealedAt: s.problemsRevealedAt })
})
