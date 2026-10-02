import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { Announcement, ANNOUNCEMENT_TYPES, ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_STATUSES } from '../models/Announcement.js'
import { ApiError } from '../middleware/errorHandler.js'
import { sanitizeText } from '../utils/sanitize.js'

const isOneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] => typeof v === 'string' && (list as readonly string[]).includes(v)

function parseDate(v: unknown, field: string): Date | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const d = new Date(String(v))
  if (Number.isNaN(d.getTime())) throw new ApiError(400, `${field} is not a valid date`)
  return d
}

/** Validates + sanitizes the writable fields. `partial` = PUT-style update (only fields present are checked). */
function readFields(body: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {}
  if (!partial || body.title !== undefined) {
    const title = sanitizeText(body.title)
    if (title.length < 3) throw new ApiError(400, 'Title must be at least 3 characters')
    if (title.length > 150) throw new ApiError(400, 'Title must be at most 150 characters')
    out.title = title
  }
  // `body` accepted as a legacy alias for `message`.
  const rawMessage = body.message ?? body.body
  if (!partial || rawMessage !== undefined) {
    const message = sanitizeText(rawMessage, { multiline: true })
    if (message.length < 3) throw new ApiError(400, 'Message must be at least 3 characters')
    if (message.length > 2000) throw new ApiError(400, 'Message must be at most 2000 characters')
    out.message = message
  }
  if (body.type !== undefined) {
    if (!isOneOf(ANNOUNCEMENT_TYPES, body.type)) throw new ApiError(400, `type must be one of ${ANNOUNCEMENT_TYPES.join(', ')}`)
    out.type = body.type
  }
  if (body.priority !== undefined) {
    if (!isOneOf(ANNOUNCEMENT_PRIORITIES, body.priority)) throw new ApiError(400, `priority must be one of ${ANNOUNCEMENT_PRIORITIES.join(', ')}`)
    out.priority = body.priority
  }
  if (body.status !== undefined) {
    if (!isOneOf(ANNOUNCEMENT_STATUSES, body.status)) throw new ApiError(400, `status must be one of ${ANNOUNCEMENT_STATUSES.join(', ')}`)
    out.status = body.status
  }
  const publishedAt = parseDate(body.publishedAt, 'publishedAt')
  if (publishedAt !== undefined) out.publishedAt = publishedAt
  const expiresAt = parseDate(body.expiresAt, 'expiresAt')
  if (expiresAt !== undefined) out.expiresAt = expiresAt
  return out
}

/**
 * GET /api/announcements — PUBLIC (no login). Visibility is decided entirely server-side:
 * status = PUBLISHED AND publishedAt <= now AND (no expiresAt or expiresAt > now).
 */
export const listAnnouncements = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date()
  const announcements = await Announcement.find({
    status: 'PUBLISHED',
    $and: [
      { $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }, { publishedAt: { $lte: now } }] },
      { $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }] },
    ],
  })
    .select('title message type priority status publishedAt createdAt updatedAt')
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(100)
    .lean()
  res.set('Cache-Control', 'no-store')
  res.json({ success: true, announcements })
})

/** GET /api/admin/announcements — admin sees EVERYTHING; supports ?q=&status=&type=&priority= filtering. */
export const listAnnouncementsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { q, status, type, priority } = req.query
  const filter: Record<string, unknown> = {}
  if (isOneOf(ANNOUNCEMENT_STATUSES, status)) filter.status = status
  if (isOneOf(ANNOUNCEMENT_TYPES, type)) filter.type = type
  if (isOneOf(ANNOUNCEMENT_PRIORITIES, priority)) filter.priority = priority
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(q.trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ title: rx }, { message: rx }]
  }
  const announcements = await Announcement.find(filter).sort({ createdAt: -1 }).limit(500).lean()
  res.json({ success: true, announcements })
})

/** POST /api/admin/announcements */
export const createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const fields = readFields(req.body ?? {}, false)
  const status = (fields.status as string | undefined) ?? 'DRAFT'
  if (status === 'UNPUBLISHED') throw new ApiError(400, 'A new announcement must be DRAFT or PUBLISHED')
  const announcement = await Announcement.create({
    ...fields,
    status,
    publishedAt: status === 'PUBLISHED' ? ((fields.publishedAt as Date | null | undefined) ?? new Date()) : undefined,
    createdBy: req.auth?.id,
  })
  res.status(201).json({ success: true, announcement })
})

/** PUT /api/admin/announcements/:id — edit content/metadata/status; never creates a duplicate. */
export const updateAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const before = await Announcement.findById(req.params.id)
  if (!before) throw new ApiError(404, 'Announcement not found')
  const fields = readFields(req.body ?? {}, true)

  const nextStatus = (fields.status as string | undefined) ?? before.status
  // Becoming PUBLISHED without an explicit time → go live now.
  if (nextStatus === 'PUBLISHED' && before.status !== 'PUBLISHED' && fields.publishedAt === undefined) fields.publishedAt = new Date()
  if (nextStatus === 'PUBLISHED' && !fields.publishedAt && !before.publishedAt) fields.publishedAt = new Date()
  if (nextStatus === 'DRAFT' && before.status === 'PUBLISHED') throw new ApiError(400, 'A published announcement can only be unpublished, not moved back to draft')

  before.set(fields)
  await before.save()

  res.json({ success: true, announcement: before })
})

/** PATCH /api/admin/announcements/:id/publish — goes live immediately (re-publish refreshes the publish time). */
export const publishAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const a = await Announcement.findById(req.params.id)
  if (!a) throw new ApiError(404, 'Announcement not found')
  a.status = 'PUBLISHED'
  a.publishedAt = new Date()
  await a.save()
  res.json({ success: true, announcement: a })
})

/** PATCH /api/admin/announcements/:id/unpublish — hides it from the public site; keeps it for re-publishing. */
export const unpublishAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const a = await Announcement.findById(req.params.id)
  if (!a) throw new ApiError(404, 'Announcement not found')
  a.status = 'UNPUBLISHED'
  await a.save()
  res.json({ success: true, announcement: a })
})

/** DELETE /api/admin/announcements/:id */
export const deleteAnnouncement = asyncHandler(async (req: Request, res: Response) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id)
  if (!announcement) throw new ApiError(404, 'Announcement not found')
  res.json({ success: true })
})
