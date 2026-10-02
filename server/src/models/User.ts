import { Schema, model, type InferSchemaType } from 'mongoose'
import bcrypt from 'bcrypt'

export const ROLES = ['TEAM_LEADER', 'TEAM_MEMBER', 'ADMIN', 'SUPER_ADMIN'] as const
export type Role = (typeof ROLES)[number]

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: 'TEAM_LEADER' },
    team: { type: Schema.Types.ObjectId, ref: 'Team' },
    active: { type: Boolean, default: true },
    // Gmail OTP verification for team registration. Defaults to true so every account created
    // outside the public /api/auth/register flow (admin accounts, seed script) is
    // unaffected — only registerTeam explicitly sets this false until OTP verification.
    emailVerified: { type: Boolean, default: true },
    // Set only for ADMIN/SUPER_ADMIN accounts created from the Admin Accounts screen.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

userSchema.methods.comparePassword = function comparePassword(this: { passwordHash: string }, plain: string) {
  return bcrypt.compare(plain, this.passwordHash)
}

export type UserDoc = InferSchemaType<typeof userSchema>
export const User = model('User', userSchema)
