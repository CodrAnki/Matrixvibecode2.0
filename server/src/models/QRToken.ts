import { Schema, model, type InferSchemaType } from 'mongoose'

const qrTokenSchema = new Schema(
  {
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    tokenHash: { type: String, required: true, unique: true },
    // Kept ONLY so the owning team can re-display their own QR later (a check-in badge, not a
    // password). Verification never reads this field: it hashes the presented token and looks the
    // hash up. It is invalidated (active:false) the moment the QR is regenerated.
    rawToken: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    active: { type: Boolean, default: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
)

// Every QR read/verify looks up "this team's currently active token" — index the pair directly.
qrTokenSchema.index({ team: 1, active: 1 })
// Temporary tokens clean themselves up: a token can never verify after expiresAt anyway, and MongoDB
// removes the document 7 days later (rotated/expired tokens therefore can't accumulate forever).
qrTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 })

export type QRTokenDoc = InferSchemaType<typeof qrTokenSchema>
export const QRToken = model('QRToken', qrTokenSchema)
