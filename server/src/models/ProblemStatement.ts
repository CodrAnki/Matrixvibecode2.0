import { Schema, model, type InferSchemaType } from 'mongoose'

const problemStatementSchema = new Schema(
  {
    // Always server-generated (see utils/generateId.ts), never admin-typed — consistent with
    // every other id in this project (teamId, checkInId).
    problemId: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    // Only `title` is truly required — everything else here is optional so an admin can save a
    // bare-bones Draft and fill in the rest later.
    shortDescription: { type: String, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    difficulty: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'INTERMEDIATE' },
    constraints: { type: String, trim: true },
    inputFormat: { type: String, trim: true },
    outputFormat: { type: String, trim: true },
    sampleInput: { type: String, trim: true },
    sampleOutput: { type: String, trim: true },
    tags: { type: [String], default: [] },
    // Draft/Published is modeled as this existing boolean (kept for backward compatibility with
    // the rest of the app, e.g. team-facing filtering) rather than adding a duplicate `status`
    // enum field. The admin API/UI presents it as Draft/Published.
    isPublished: { type: Boolean, default: false },
    // Soft delete: a problem referenced by Teams is never hard-deleted,
    // so those records keep a valid, populate-able reference. Excluded from every normal list.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
)

problemStatementSchema.index({ isPublished: 1, isDeleted: 1 })

export type ProblemStatementDoc = InferSchemaType<typeof problemStatementSchema>
export const ProblemStatement = model('ProblemStatement', problemStatementSchema)
