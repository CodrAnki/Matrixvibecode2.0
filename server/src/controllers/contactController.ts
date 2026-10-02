import asyncHandler from 'express-async-handler'
import type { Request, Response } from 'express'
import { ContactMessage } from '../models/ContactMessage.js'
import { ApiError } from '../middleware/errorHandler.js'
import { sanitizeText } from '../utils/sanitize.js'
import { sendWhatsAppNotification } from '../services/whatsappService.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9][0-9\s-]{5,18}[0-9]$/
export const CONTACT_LIMITS = { nameMin: 2, nameMax: 100, emailMax: 254, messageMin: 10, messageMax: 1000 } as const
const SUCCESS = 'Your message has been submitted successfully.'

/**
 * POST /api/contact — public, rate-limited. The ONLY way a WhatsApp notification is triggered:
 * a validated contact-form submission. There is no endpoint that sends arbitrary text.
 */
export const submitContact = asyncHandler(async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  if (typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'Invalid request.')

  // Honeypot: real users never see/fill this field. Pretend success so bots learn nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') return void res.status(201).json({ success: true, message: SUCCESS })

  for (const k of ['name', 'email', 'message'] as const) {
    if (typeof body[k] !== 'string') throw new ApiError(400, `${k} is required.`)
  }
  if (body.phone != null && typeof body.phone !== 'string') throw new ApiError(400, 'Invalid phone number.')

  const name = sanitizeText(body.name)
  const email = sanitizeText(body.email).toLowerCase()
  const phone = sanitizeText(body.phone ?? '')
  const message = sanitizeText(body.message, { multiline: true })

  if (name.length < CONTACT_LIMITS.nameMin) throw new ApiError(400, 'Please enter your name.')
  if (name.length > CONTACT_LIMITS.nameMax) throw new ApiError(400, `Name must be at most ${CONTACT_LIMITS.nameMax} characters.`)
  if (!EMAIL_RE.test(email) || email.length > CONTACT_LIMITS.emailMax) throw new ApiError(400, 'Please enter a valid email address.')
  if (phone && !PHONE_RE.test(phone)) throw new ApiError(400, 'Please enter a valid phone number.')
  if (message.length < CONTACT_LIMITS.messageMin) throw new ApiError(400, `Message should be at least ${CONTACT_LIMITS.messageMin} characters.`)
  if (message.length > CONTACT_LIMITS.messageMax) throw new ApiError(400, `Message must be at most ${CONTACT_LIMITS.messageMax} characters.`)

  const submittedAt = new Date()

  // 1) Persist first so a submission is never lost if WhatsApp is down.
  let saved: InstanceType<typeof ContactMessage> | null = null
  try {
    saved = await ContactMessage.create({ name, email, phone: phone || undefined, message })
  } catch (err) {
    console.error('[contact] failed to store submission:', (err as Error)?.message)
  }

  // 2) Notify WhatsApp from the backend. Never throws.
  const result = await sendWhatsAppNotification({ name, email, phone: phone || undefined, message, submittedAt })

  if (saved) {
    saved.whatsappSent = result.sent
    saved.whatsappError = result.sent ? null : (result.reason ?? 'unknown')
    await saved.save().catch((e) => console.error('[contact] failed to update status:', (e as Error)?.message))
  }

  // Both storage and notification failed: the message really was lost, so don't claim success.
  if (!saved && !result.sent) throw new ApiError(503, 'We could not submit your message right now. Please try again shortly.')

  // Internal failure details (WhatsApp errors, tokens) are never exposed to the client.
  res.status(201).json({ success: true, message: SUCCESS })
})
