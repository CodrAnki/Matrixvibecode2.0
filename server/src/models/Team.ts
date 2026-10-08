import { Schema, model, type InferSchemaType } from 'mongoose'
import { HARD_MAX_TEAM_SIZE } from '../utils/memberValidation.js'

export const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'CHANGES_REQUIRED'] as const
export const EVENT_STATUSES = [
  'REGISTERED', 'TEAM_FORMED', 'VERIFICATION_PENDING', 'VERIFIED', 'PROBLEM_SELECTED', 'BUILDING',
] as const

// Only "1st Year" is selectable. The field itself is OPTIONAL (null / missing is valid).
export const TEAM_YEARS = ['1st Year'] as const
export type TeamYear = (typeof TEAM_YEARS)[number]

const memberSchema = new Schema(
  {
    memberId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    // Optional at the schema level for teams registered before email/phone were asked for; both
    // forms now collect them.
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    year: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'REMOVED'], default: 'ACTIVE' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
)

const verificationHistorySchema = new Schema(
  {
    status: { type: String, enum: VERIFICATION_STATUSES, required: true },
    note: { type: String, trim: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const teamSchema = new Schema(
  {
    teamId: { type: String, required: true, unique: true, index: true },
    teamName: { type: String, required: true, trim: true, unique: true },
    leader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Optional team year chosen at registration. Pre-existing teams without it keep working.
    teamYear: { type: String, enum: { values: [...TEAM_YEARS, null], message: 'teamYear must be "1st Year" or empty' }, required: false, default: null },
    phone: { type: String, trim: true },
    // Bounded: the controllers enforce MAX_TEAM_SIZE (solo or duo); this is the loose schema backstop.
    members: {
      type: [memberSchema],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= HARD_MAX_TEAM_SIZE - 1, message: 'Too many team members' },
    },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING' },
    verificationHistory: { type: [verificationHistorySchema], default: [] },
    // Gmail OTP registration-completion status — distinct from verificationStatus above, which
    // is the admin's separate eligibility approval (PENDING/VERIFIED/REJECTED). This one just
    // tracks whether the leader's email OTP was ever completed. Defaults VERIFIED so teams that
    // existed before this feature aren't retroactively treated as incomplete registrations.
    registrationStatus: { type: String, enum: ['PENDING', 'VERIFIED'], default: 'VERIFIED' },
    eventStatus: { type: String, enum: EVENT_STATUSES, default: 'REGISTERED' },
    problemStatement: { type: Schema.Types.ObjectId, ref: 'ProblemStatement' },
    qrTokenId: { type: Schema.Types.ObjectId, ref: 'QRToken' },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
    disabled: { type: Boolean, default: false },
    // Soft delete: a deleted team moves to "Deleted Teams" and disappears from every normal
    // active-teams query, but its row (and every record referencing it) is preserved so it can
    // be restored. Only permanentDeleteTeam ever actually removes rows.
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Explicit, admin-set flag for test/demo teams created during development or rehearsal —
    // "Delete Test Teams" only ever touches { isDummy: true }, never an unscoped deleteMany.
    isDummy: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// Indexes below exist for queries the app actually runs (teamId/teamName uniqueness is declared on the fields above):
//   leader          -> "which team does this leader own" (selectProblem, admin lookups)
//   createdAt       -> default admin team list sort + registrations-by-day
//   members.email   -> duplicate-member checks on registration and add-member (every call)
teamSchema.index({ leader: 1 })
teamSchema.index({ createdAt: -1 })
teamSchema.index({ 'members.email': 1 })
// { isDeleted: 1, deletedAt: -1 } also serves plain { isDeleted } lookups (leftmost prefix), so no separate single-field index.
teamSchema.index({ isDeleted: 1, deletedAt: -1 })

export type TeamDoc = InferSchemaType<typeof teamSchema>
export const Team = model('Team', teamSchema)
