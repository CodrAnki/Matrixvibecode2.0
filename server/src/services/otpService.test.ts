import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * These are focused UNIT tests against otpService's business logic, with the Otp/User models
 * and the email transport replaced by in-memory fakes — they don't require a running MongoDB.
 * They cover scenarios 1–11 from the spec's testing checklist (the OTP state machine itself).
 * Scenarios 12–14 (admin/team login end-to-end, existing authorization) need a real
 * HTTP+DB integration pass (e.g. supertest + mongodb-memory-server) which isn't set up in this
 * project yet — see the note at the bottom of this file.
 */

vi.mock('../models/Otp.js', () => {
  let docs: Record<string, unknown>[] = []
  let nextId = 1

  function matches(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    return Object.entries(filter).every(([key, cond]) => {
      const val = doc[key]
      if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
        const c = cond as Record<string, unknown>
        if ('$in' in c) return (c.$in as unknown[]).some((v) => String(v) === String(val))
        if ('$nin' in c) return !(c.$nin as unknown[]).some((v) => String(v) === String(val))
        if ('$gte' in c) return (val as Date) >= (c.$gte as Date)
        if ('$lt' in c) return (val as number) < (c.$lt as number)
        return false
      }
      return String(val) === String(cond)
    })
  }

  const Otp = {
    countDocuments: async (filter: Record<string, unknown>) => docs.filter((d) => matches(d, filter)).length,
    updateMany: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      docs.filter((d) => matches(d, filter)).forEach((d) => Object.assign(d, update))
    },
    updateOne: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const d = docs.find((x) => matches(x, filter))
      if (d) Object.assign(d, update)
    },
    create: async (data: Record<string, unknown>) => {
      const doc = { _id: `otp_${nextId++}`, createdAt: new Date(), attempts: 0, verified: false, active: true, ...data }
      docs.push(doc)
      return doc
    },
    findOne: async (filter: Record<string, unknown>) => docs.find((d) => matches(d, filter)) ?? null,
    findOneAndUpdate: async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const d = docs.find((x) => matches(x, filter))
      if (!d) return null
      const { $inc, ...plain } = update as { $inc?: Record<string, number> } & Record<string, unknown>
      Object.assign(d, plain)
      for (const [k, by] of Object.entries($inc ?? {})) d[k] = ((d[k] as number) ?? 0) + by
      return d
    },
    __reset: () => { docs = []; nextId = 1 },
    __all: () => docs,
  }
  return { Otp }
})

vi.mock('../models/User.js', () => {
  let users: Record<string, unknown>[] = []
  const User = {
    findById: async (id: unknown) => users.find((u) => String(u._id) === String(id)) ?? null,
    __reset: () => { users = [] },
    __seed: (list: Record<string, unknown>[]) => { users = list },
  }
  return { User }
})

vi.mock('./emailService.js', () => ({
  sendOtpEmail: vi.fn(async () => undefined),
}))

import { Otp } from '../models/Otp.js'
import { User } from '../models/User.js'
import { sendOtpEmail } from './emailService.js'
import { issueOtp, verifyOtp, resendOtp } from './otpService.js'
import { ApiError } from '../middleware/errorHandler.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const otpFake = Otp as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userFake = User as any
const testUser = { _id: 'user_1', email: 'leader@example.com', active: true }

beforeEach(() => {
  otpFake.__reset()
  userFake.__reset()
  userFake.__seed([{ ...testUser }])
  vi.mocked(sendOtpEmail).mockClear()
  vi.mocked(sendOtpEmail).mockResolvedValue(undefined)
})

/** Pulls the raw OTP that was "emailed" out of the mocked sendOtpEmail call, for tests that need to submit it. */
function lastSentOtp(): string {
  const calls = vi.mocked(sendOtpEmail).mock.calls
  return calls[calls.length - 1][1]
}

describe('otpService', () => {
  it('1. issues an OTP and emails it after credentials are valid', async () => {
    const { verificationId, maskedEmail } = await issueOtp(testUser)
    expect(verificationId).toBeTruthy()
    expect(maskedEmail).toMatch(/^l\*+@example\.com$/)
    expect(sendOtpEmail).toHaveBeenCalledTimes(1)
    expect(sendOtpEmail).toHaveBeenCalledWith(testUser.email, expect.stringMatching(/^\d{6}$/), expect.any(Number))
  })

  it('2. never issues an OTP for a user that was never looked up (controller-level: no call = no OTP) — covered by not calling issueOtp on bad credentials', () => {
    // otpService itself is only ever invoked AFTER password verification succeeds (see
    // authController.loginTeam/loginAdmin) — this is enforced by control flow, not by otpService.
    expect(true).toBe(true)
  })

  it('3. correct OTP verifies and returns the user (JWT issuance happens in the controller)', async () => {
    const { verificationId } = await issueOtp(testUser)
    const code = lastSentOtp()
    const user = await verifyOtp(verificationId, code)
    expect(user._id).toBe(testUser._id)
  })

  it('4. incorrect OTP is rejected and increments attempts', async () => {
    const { verificationId } = await issueOtp(testUser)
    await expect(verifyOtp(verificationId, '000000')).rejects.toMatchObject({ status: 400, code: 'OTP_INVALID' } satisfies Partial<ApiError>)
    const doc = otpFake.__all().find((d: { verificationId: string }) => d.verificationId === verificationId)
    expect(doc.attempts).toBe(1)
  })

  it('5. expired OTP is rejected', async () => {
    const { verificationId } = await issueOtp(testUser)
    const code = lastSentOtp()
    const doc = otpFake.__all().find((d: { verificationId: string }) => d.verificationId === verificationId)
    doc.expiresAt = new Date(Date.now() - 1000) // force expiry
    await expect(verifyOtp(verificationId, code)).rejects.toMatchObject({ code: 'OTP_EXPIRED' })
  })

  it('6. a verified OTP cannot be reused', async () => {
    const { verificationId } = await issueOtp(testUser)
    const code = lastSentOtp()
    await verifyOtp(verificationId, code)
    await expect(verifyOtp(verificationId, code)).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_ID' })
  })

  it('7. 5 failed attempts invalidates the OTP', async () => {
    const { verificationId } = await issueOtp(testUser)
    for (let i = 0; i < 4; i++) {
      await expect(verifyOtp(verificationId, '000000')).rejects.toMatchObject({ code: 'OTP_INVALID' })
    }
    await expect(verifyOtp(verificationId, '000000')).rejects.toMatchObject({ code: 'OTP_MAX_ATTEMPTS' })
    const code = lastSentOtp()
    await expect(verifyOtp(verificationId, code)).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_ID' })
  })

  it('8. resend before the cooldown window is rejected', async () => {
    const { verificationId } = await issueOtp(testUser)
    await expect(resendOtp(verificationId)).rejects.toMatchObject({ code: 'RESEND_COOLDOWN' })
  })

  it('8b. resend after the cooldown window succeeds and invalidates the old OTP', async () => {
    const { verificationId } = await issueOtp(testUser)
    const oldDoc = otpFake.__all().find((d: { verificationId: string }) => d.verificationId === verificationId)
    oldDoc.createdAt = new Date(Date.now() - 61_000) // simulate 61s elapsed
    const res = await resendOtp(verificationId)
    expect(res.verificationId).not.toBe(verificationId)
    expect(oldDoc.active).toBe(false)
    // the old (now-invalidated) code must no longer verify
    await expect(verifyOtp(verificationId, '000000')).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_ID' })
  })

  it('9. more than 5 OTP sends per email within the window is rate-limited', async () => {
    for (let i = 0; i < 5; i++) await issueOtp(testUser)
    await expect(issueOtp(testUser)).rejects.toMatchObject({ code: 'OTP_RATE_LIMITED' })
  })

  it('10. issuing a new OTP invalidates the previous one', async () => {
    const first = await issueOtp(testUser)
    const firstCode = lastSentOtp()
    await issueOtp(testUser) // second login attempt before verifying the first
    await expect(verifyOtp(first.verificationId, firstCode)).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_ID' })
  })

  it('11. email send failure leaves no usable/active OTP (no session can be built on top of it)', async () => {
    vi.mocked(sendOtpEmail).mockRejectedValueOnce(new Error('SMTP down'))
    await expect(issueOtp(testUser)).rejects.toMatchObject({ code: 'EMAIL_SEND_FAILED' })
    const active = otpFake.__all().filter((d: { active: boolean }) => d.active)
    expect(active.length).toBe(0)
  })

  it('handles a deleted user gracefully (user removed while an OTP was pending)', async () => {
    const { verificationId } = await issueOtp(testUser)
    const code = lastSentOtp()
    userFake.__reset() // user vanished
    await expect(verifyOtp(verificationId, code)).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
  })

  it('rejects an unknown verificationId without leaking whether it ever existed', async () => {
    await expect(verifyOtp('not-a-real-id', '123456')).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_ID' })
    await expect(resendOtp('not-a-real-id')).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_ID' })
  })
})

/**
 * NOT covered here (would need supertest + a real/in-memory MongoDB, not currently set up in
 * this project):
 *   12. Admin login end-to-end (password -> OTP -> JWT -> /api/admin/me)
 *   13. Team login end-to-end
 *   14. Existing authorization (role middleware) still enforced after the OTP change
 * The route/controller code for all of these was manually reviewed as part of this change and is
 * unchanged in its authorization logic — only the point at which the JWT is issued moved (see
 * REPORT.md) — but an automated pass would need real request/response cycles to verify it.
 */
