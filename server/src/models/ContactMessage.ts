import { Schema, model, type InferSchemaType } from 'mongoose'

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 20 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    // Whether the backend WhatsApp notification went out; lets an admin find missed ones.
    whatsappSent: { type: Boolean, default: false },
    whatsappError: { type: String, default: null },
  },
  { timestamps: true },
)

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema>
export const ContactMessage = model('ContactMessage', contactMessageSchema)
