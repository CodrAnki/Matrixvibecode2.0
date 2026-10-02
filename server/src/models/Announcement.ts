import { Schema, model, type InferSchemaType } from 'mongoose'

export const ANNOUNCEMENT_TYPES = ['GENERAL', 'IMPORTANT', 'DEADLINE', 'SYSTEM'] as const
export const ANNOUNCEMENT_PRIORITIES = ['NORMAL', 'HIGH', 'URGENT'] as const
export const ANNOUNCEMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] as const

const announcementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, enum: ANNOUNCEMENT_TYPES, default: 'GENERAL' },
    priority: { type: String, enum: ANNOUNCEMENT_PRIORITIES, default: 'NORMAL' },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: 'DRAFT' },
    // When the announcement goes (or went) live. A future value = scheduled: it stays hidden from
    // the public API until that moment, decided server-side, never by a frontend timer.
    publishedAt: { type: Date },
    expiresAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

announcementSchema.index({ status: 1, publishedAt: -1 })

export type AnnouncementDoc = InferSchemaType<typeof announcementSchema>
export const Announcement = model('Announcement', announcementSchema)

/**
 * One-time, idempotent upgrade of announcements created before the status/message schema:
 * body→message, published:boolean→status, publishAt→publishedAt, legacy types→new types.
 * Runs at server start; a no-op once everything is migrated.
 */
export async function migrateLegacyAnnouncements(): Promise<number> {
  const coll = Announcement.collection
  const legacy = await coll.find({ status: { $exists: false } }).toArray()
  for (const d of legacy) {
    const published = d.published !== false
    const typeMap: Record<string, string> = { URGENT: 'IMPORTANT', SCHEDULE: 'DEADLINE', SUBMISSION: 'DEADLINE', REGISTRATION: 'GENERAL', WORKSHOP: 'GENERAL', JUDGING: 'GENERAL', OTHER: 'GENERAL' }
    const type = (ANNOUNCEMENT_TYPES as readonly string[]).includes(d.type) ? d.type : typeMap[d.type as string] ?? 'GENERAL'
    await coll.updateOne(
      { _id: d._id },
      {
        $set: {
          message: d.message ?? d.body ?? '',
          status: published ? 'PUBLISHED' : 'DRAFT',
          type,
          ...(published ? { publishedAt: d.publishAt ?? d.createdAt ?? new Date() } : {}),
        },
        $unset: { body: '', published: '', publishAt: '' },
      },
    )
  }
  return legacy.length
}
