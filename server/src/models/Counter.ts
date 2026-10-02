import { Schema, model } from 'mongoose'

/**
 * Atomic sequence counters (one document per sequence, e.g. "teamId", "problemId").
 * Only ever advanced with a single `$inc` — see utils/sequence.ts. Tiny, bounded (one doc per
 * sequence), and never deleted: that is also what guarantees an ID is never reused after a team
 * is permanently deleted.
 */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
)

export const Counter = model('Counter', counterSchema)
