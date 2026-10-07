import { Schema, model, type InferSchemaType } from 'mongoose'

/** Singleton-style settings document (findOne, or seed one). Holds admin-configurable event settings. */
const eventSchema = new Schema(
  {
    name: { type: String, default: 'MATRIX Vibe Coding 2.0' },
    registrationOpen: { type: Boolean, default: true },
    checkInOpen: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export type EventDoc = InferSchemaType<typeof eventSchema>
export const EventSettings = model('Event', eventSchema)
