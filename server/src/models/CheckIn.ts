import { Schema, model, type InferSchemaType } from 'mongoose'

const checkInSchema = new Schema(
  {
    checkInId: { type: String, required: true, unique: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true, unique: true },
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    checkedInAt: { type: Date, default: Date.now },
    location: { type: String, trim: true },
    deviceInfo: { type: String, trim: true },
  },
  { timestamps: true },
)

// Admin "recent check-ins" list sorts newest-first.
checkInSchema.index({ checkedInAt: -1 })

export type CheckInDoc = InferSchemaType<typeof checkInSchema>
export const CheckIn = model('CheckIn', checkInSchema)
