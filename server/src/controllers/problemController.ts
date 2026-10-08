import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { ProblemStatement } from '../models/ProblemStatement.js'
import { EventSettings } from '../models/Event.js'
import { Team } from '../models/Team.js'
import { ApiError } from '../middleware/errorHandler.js'
import { generateProblemId } from '../utils/generateId.js'
import { serializeTeam } from '../services/teamService.js'

const EDITABLE_FIELDS = [
  'title', 'shortDescription', 'description', 'category', 'difficulty',
  'constraints', 'inputFormat', 'outputFormat', 'sampleInput', 'sampleOutput', 'tags',
] as const

function pickEditable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) if (key in body) out[key] = body[key]
  return out
}

/**
 * GET /api/admin/problems — admin-facing: every non-deleted problem (draft + published), so the
 * management page can list everything. Deleted problems never appear.
 */
export const listProblems = asyncHandler(async (_req: Request, res: Response) => {
  const problems = await ProblemStatement.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(500)
  res.json({ success: true, problems })
})

/**
 * GET /api/problems — public. Returns NOTHING until the official reveal (EventSettings.problemsRevealed),
 * then every published, non-deleted problem. The one exception is a signed-in admin asking for
 * `?preview=1`, which lets them test the participant view before the reveal; for anyone else the
 * flag is ignored. An empty list is a normal state, never an error.
 */
export const listPublicProblems = asyncHandler(async (req: Request, res: Response) => {
  const settings = await EventSettings.findOne().lean()
  const revealed = settings?.problemsRevealed === true
  const isAdmin = req.auth?.role === 'ADMIN' || req.auth?.role === 'SUPER_ADMIN'
  const preview = !revealed && isAdmin && req.query.preview === '1'

  // Per-user (an admin preview carries problems) and must change the instant a reveal happens.
  res.set('Cache-Control', 'private, no-store')
  if (!revealed && !preview) {
    res.json({ success: true, revealed: false, preview: false, problems: [] })
    return
  }
  const problems = await ProblemStatement.find({ isPublished: true, isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(500)
  res.json({ success: true, revealed, preview, problems })
})

/** GET /api/admin/problems/:id — full detail for the admin "View"/"Edit" actions. */
export const getProblemDetail = asyncHandler(async (req: Request, res: Response) => {
  const problem = await ProblemStatement.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
  if (!problem) throw new ApiError(404, 'Problem statement not found')
  res.json({ success: true, problem })
})

/**
 * POST /api/admin/problems — only `title` is mandatory. `problemId` is always server-generated
 * (see generateId.ts), matching every other id in this project. Defaults to Draft
 * (isPublished:false) unless the caller explicitly asks to publish immediately.
 */
export const createProblem = asyncHandler(async (req: Request, res: Response) => {
  const { title } = req.body as { title?: string }
  if (!title || !title.trim()) throw new ApiError(400, 'title is required')

  const problemId = await generateProblemId()
  const problem = await ProblemStatement.create({
    ...pickEditable(req.body),
    title: title.trim(),
    problemId,
    isPublished: req.body.isPublished === true || req.body.status === 'PUBLISHED',
  })
  res.status(201).json({ success: true, problem })
})

/** PUT /api/admin/problems/:id — edits in place; never creates a duplicate, never changes problemId/isDeleted/isPublished (publish state has its own dedicated endpoints below). */
export const updateProblem = asyncHandler(async (req: Request, res: Response) => {
  const problem = await ProblemStatement.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
  if (!problem) throw new ApiError(404, 'Problem statement not found')
  if (req.body.title !== undefined && !String(req.body.title).trim()) throw new ApiError(400, 'title cannot be empty')

  Object.assign(problem, pickEditable(req.body))
  await problem.save()
  res.json({ success: true, problem })
})

/** PATCH /api/admin/problems/:id/publish — DRAFT -> PUBLISHED. Only then is it visible to teams. */
export const publishProblem = asyncHandler(async (req: Request, res: Response) => {
  const problem = await ProblemStatement.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { isPublished: true },
    { new: true },
  )
  if (!problem) throw new ApiError(404, 'Problem statement not found')
  res.json({ success: true, problem })
})

/** PATCH /api/admin/problems/:id/unpublish — PUBLISHED -> DRAFT. Teams immediately stop seeing it. */
export const unpublishProblem = asyncHandler(async (req: Request, res: Response) => {
  const problem = await ProblemStatement.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { isPublished: false },
    { new: true },
  )
  if (!problem) throw new ApiError(404, 'Problem statement not found')
  res.json({ success: true, problem })
})

/**
 * DELETE /api/admin/problems/:id — always a soft delete (isDeleted:true), never a hard
 * Mongo-level delete: any Team that selected this problem keeps a valid reference and its populated title/details rather than pointing at nothing.
 * The record simply stops appearing in every normal admin/team list.
 */
export const deleteProblem = asyncHandler(async (req: Request, res: Response) => {
  const problem = await ProblemStatement.findOneAndUpdate(
    { _id: req.params.id, isDeleted: { $ne: true } },
    { isDeleted: true, isPublished: false },
    { new: true },
  )
  if (!problem) throw new ApiError(404, 'Problem statement not found')

  const teamsUsingIt = await Team.countDocuments({ problemStatement: problem._id, isDeleted: { $ne: true } })
  res.json({ success: true, referencedByTeams: teamsUsingIt })
})

/** POST /api/teams/me/problem — a team selects a published, non-deleted problem statement. */
export const selectProblem = asyncHandler(async (req: Request, res: Response) => {
  const problemId = (req.body ?? {}).problemId
  if (typeof problemId !== 'string' || !problemId) throw new ApiError(400, 'problemId is required')
  const settings = await EventSettings.findOne().lean()
  if (settings?.problemsRevealed !== true) {
    throw new ApiError(403, 'Problem statements have not been revealed yet.', 'NOT_REVEALED')
  }
  const problem = await ProblemStatement.findOne({ _id: problemId, isPublished: true, isDeleted: { $ne: true } })
  if (!problem) throw new ApiError(404, 'Problem statement not found')
  const team = await Team.findOne({ leader: req.auth?.id, isDeleted: { $ne: true } })
  if (!team) throw new ApiError(404, 'Team not found')
  if (team.verificationStatus !== 'VERIFIED') throw new ApiError(400, 'Team must be verified before selecting a problem statement')
  if (team.disabled) throw new ApiError(403, 'Your team has been disabled by an admin — contact support', 'TEAM_DISABLED')
  team.problemStatement = problem._id
  team.eventStatus = 'PROBLEM_SELECTED'
  await team.save()
  res.json({ success: true, team: serializeTeam(team) })
})
