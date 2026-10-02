import { Schema, model, type InferSchemaType } from 'mongoose'

const otpSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // Never the raw code — only a bcrypt hash of it. The raw 6-digit code is generated,
    // emailed once, and never persisted anywhere.
    otpHash: { type: String, required: true },
    // Opaque, unguessable reference the frontend holds between login and OTP verification.
    // Deliberately NOT the userId/email, so a client can't correlate it to an account.
    verificationId: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    // Only the most recently issued OTP for a user is "active". Generating a new one
    // (login retry or resend) immediately deactivates any prior pending OTP for that user.
    active: { type: Boolean, default: true },
    // What this code is for. 'AUTH' (login / registration) is the default and the original behaviour; records
    // written before this field existed have no value and are treated as 'AUTH'. A PASSWORD_RESET code can never
    // be redeemed at /verify-otp (and vice versa), so a reset code can never open a session.
    purpose: { type: String, enum: ['AUTH', 'PASSWORD_RESET'], default: 'AUTH' },
    // PASSWORD_RESET only: after the code is verified, the single-use reset token that authorises the new
    // password. Only its SHA-256 hash is stored.
    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date },
    resetTokenUsed: { type: Boolean, default: false },
  },
  { timestamps: true },
)

// verificationId lookups (the verify/resend hot path) are served by its `unique: true` index above.
// Rate-limit counting ("N sends per email per window") scans recent docs for this email.
otpSchema.index({ email: 1, createdAt: 1 })
// TTL cleanup: MongoDB removes a document ~10 minutes after its expiresAt passes. The extra
// buffer (rather than expireAfterSeconds: 0) means the app itself can still return a proper
// "OTP has expired" error in that window, instead of the record vanishing right at expiry and
// verify-otp only being able to say "invalid verification session".
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 })
// Reset-token lookups (only documents that actually carry a token are indexed).
otpSchema.index({ resetTokenHash: 1 }, { sparse: true })

export type OtpDoc = InferSchemaType<typeof otpSchema>
export const Otp = model('Otp', otpSchema)
