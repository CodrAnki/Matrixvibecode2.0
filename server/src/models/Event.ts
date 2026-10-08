import { Schema, model, type InferSchemaType } from 'mongoose'

/** Singleton-style settings document (findOne, or seed one). Holds admin-configurable event settings. */
const eventSchema = new Schema(
  {
    name: { type: String, default: 'MATRIX Vibe Coding 2.0' },
    // No maxTeamSize here on purpose: the event is solo or duo, fixed in code as MAX_TEAM_SIZE.
    registrationOpen: { type: Boolean, default: true },
    checkInOpen: { type: Boolean, default: false },
    // The official problem-statement reveal. Until this is true the public problems endpoint returns
    // nothing, regardless of each problem's own isPublished flag. Flipped by an admin on event day.
    problemsRevealed: { type: Boolean, default: false },
    problemsRevealedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export type EventDoc = InferSchemaType<typeof eventSchema>
export const EventSettings = model('Event', eventSchema)
