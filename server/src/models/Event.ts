import { Schema, model, type InferSchemaType } from 'mongoose'

/** Singleton-style settings document (findOne, or seed one). Holds admin-configurable event settings. */
const eventSchema = new Schema(
  {
    name: { type: String, default: 'MATRIX Vibe Coding 2.0' },
    // Includes the team leader: 4 = 1 leader + at most 3 members. Admin API limits this to 1..20.
    maxTeamSize: { type: Number, default: 4, min: 1, max: 20 },
    registrationOpen: { type: Boolean, default: true },
    checkInOpen: { type: Boolean, default: false },
  },
  { timestamps: true },
)

export type EventDoc = InferSchemaType<typeof eventSchema>
export const EventSettings = model('Event', eventSchema)
