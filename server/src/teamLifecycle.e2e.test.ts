/**
 * End-to-end test of a team's whole life across the team dashboard and the admin panel:
 * register → verify → QR → roster change → changes requested → resubmit → disable → check-in.
 * Every step is the API call a real button makes, and each assertion is a logic gap that existed
 * before (verify offered on a verified team, rejecting a checked-in team, "Disable" doing nothing,
 * the "Check-in open" switch doing nothing, QR codes expiring before event day, etc.).
 * Needs a dedicated MongoDB — it clears teams, users, QR tokens, check-ins and event settings:
 *   E2E_MONGODB_URI=mongodb://localhost:27017/matrix_e2e npm test
 * Skipped automatically when E2E_MONGODB_URI is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import type { Express } from 'express'

const URI = process.env.E2E_MONGODB_URI
const d = URI ? describe : describe.skip

d('Team lifecycle (team dashboard ↔ admin panel)', () => {
  let app: Express
  let admin = ''
  let superAdmin = ''
  let team = ''
  let teamId = ''
  let qrUrl = ''
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
  const qrParts = (url: string) => { const u = new URL(url); return { teamId: u.pathname.split('/').pop()!, token: u.searchParams.get('t')! } }
  const me = async () => (await request(app).get('/api/auth/me').set(auth(team))).body.team
  const setCheckIn = async (open: boolean) => {
    const { EventSettings } = await import('./models/Event.js')
    await EventSettings.updateOne({}, { checkInOpen: open }, { upsert: true })
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-secret'
    process.env.NODE_ENV = 'test'
    await mongoose.connect(URI!)
    const { createApp } = await import('./app.js')
    const { User } = await import('./models/User.js')
    const { Team } = await import('./models/Team.js')
    const { EventSettings } = await import('./models/Event.js')
    const { QRToken } = await import('./models/QRToken.js')
    const { CheckIn } = await import('./models/CheckIn.js')
    const { signToken } = await import('./utils/generateToken.js')
    await Promise.all([Team.deleteMany({}), User.deleteMany({}), EventSettings.deleteMany({}), QRToken.deleteMany({}), CheckIn.deleteMany({})])
    await EventSettings.create({ registrationOpen: true, checkInOpen: false })
    const a = await User.create({ name: 'Admin', email: 'e2e-admin@x.com', passwordHash: 'x', role: 'ADMIN' })
    const s = await User.create({ name: 'Super', email: 'e2e-super@x.com', passwordHash: 'x', role: 'SUPER_ADMIN' })
    admin = signToken({ id: String(a._id), role: 'ADMIN' })
    superAdmin = signToken({ id: String(s._id), role: 'SUPER_ADMIN' })
    app = createApp()
  })
  afterAll(async () => {
    const { User } = await import('./models/User.js')
    const { Team } = await import('./models/Team.js')
    const { EventSettings } = await import('./models/Event.js')
    const { QRToken } = await import('./models/QRToken.js')
    const { CheckIn } = await import('./models/CheckIn.js')
    await Promise.all([Team.deleteMany({}), User.deleteMany({}), EventSettings.deleteMany({}), QRToken.deleteMany({}), CheckIn.deleteMany({})])
    await mongoose.disconnect()
  })

  it('registers a solo first-year team as PENDING', async () => {
    const r = await request(app).post('/api/auth/register').send({
      teamName: 'Null Pointers', leaderName: 'Aditi Sharma', email: 'aditi@x.com', phone: '9876543210',
      teamYear: '1st Year', password: 'password123', members: [],
    })
    expect(r.status).toBe(200)
    team = r.body.token
    teamId = r.body.team.teamId
    expect(r.body.team.verificationStatus).toBe('PENDING')
    expect(r.body.team.teamYear).toBe('1st Year')
  })

  it('has no QR before verification', async () => {
    expect((await request(app).get('/api/teams/me/qr').set(auth(team))).body.code).toBe('TEAM_NOT_VERIFIED')
    expect((await request(app).get(`/api/admin/teams/${teamId}/qr`).set(auth(admin))).status).toBe(400)
  })

  it('verifies once — a second Verify is refused instead of duplicating history', async () => {
    const v = await request(app).patch(`/api/admin/teams/${teamId}/verify`).set(auth(admin)).send({ note: 'Looks good' })
    expect(v.status).toBe(200)
    expect(v.body.team.eventStatus).toBe('VERIFIED')
    const again = await request(app).patch(`/api/admin/teams/${teamId}/verify`).set(auth(admin)).send({})
    expect(again.status).toBe(409)
    expect(again.body.code).toBe('NO_CHANGE')
    expect((await me()).verificationHistory.filter((h: { status: string }) => h.status === 'VERIFIED')).toHaveLength(1)
  })

  it('team and admin see the SAME QR, and viewing it never reissues it', async () => {
    const t = await request(app).get('/api/teams/me/qr').set(auth(team))
    expect(t.status).toBe(200)
    qrUrl = t.body.qr.url
    const a1 = await request(app).get(`/api/admin/teams/${teamId}/qr`).set(auth(admin))
    const a2 = await request(app).get(`/api/admin/teams/${teamId}/qr`).set(auth(admin))
    expect(a1.body.qr.url).toBe(qrUrl)
    expect(a2.body.qr.url).toBe(qrUrl)
  })

  it('QR stays valid through event day even if issued long before', async () => {
    const { QRToken } = await import('./models/QRToken.js')
    // Simulate the old 14-day TTL having already run out.
    await QRToken.updateMany({}, { expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
    await setCheckIn(true)
    const r = await request(app).post('/api/admin/qr/verify').set(auth(admin)).send(qrParts(qrUrl))
    expect(r.status).toBe(200)
    expect(r.body.team.teamId).toBe(teamId)
    await setCheckIn(false)
  })

  it('refuses scans while "Check-in open" is off', async () => {
    const r = await request(app).post('/api/admin/qr/verify').set(auth(admin)).send(qrParts(qrUrl))
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('CHECKIN_CLOSED')
    expect((await request(app).post(`/api/admin/teams/${teamId}/checkin`).set(auth(admin))).body.code).toBe('CHECKIN_CLOSED')
  })

  it('requires the teammate phone and an explicit year', async () => {
    const noPhone = await request(app).post(`/api/teams/${teamId}/members`).set(auth(team)).send({ name: 'Rohan Verma', email: 'rohan@x.com', year: '1st Year' })
    expect(noPhone.status).toBe(400)
    const noYear = await request(app).post(`/api/teams/${teamId}/members`).set(auth(team)).send({ name: 'Rohan Verma', email: 'rohan@x.com', phone: '9123456780' })
    expect(noYear.status).toBe(400)
  })

  it('adding a non-first-year teammate after verification: back to PENDING, loses First Year, QR stops working', async () => {
    const r = await request(app).post(`/api/teams/${teamId}/members`).set(auth(team)).send({ name: 'Rohan Verma', email: 'rohan@x.com', phone: '9123456780', year: 'Not 1st Year' })
    expect(r.status).toBe(201)
    expect(r.body.team.members).toHaveLength(1)
    expect(r.body.team.verificationStatus).toBe('PENDING')
    expect(r.body.team.eventStatus).toBe('VERIFICATION_PENDING')
    expect(r.body.team.teamYear).toBeNull()
    await setCheckIn(true)
    expect((await request(app).post('/api/admin/qr/verify').set(auth(admin)).send(qrParts(qrUrl))).body.code).toBe('TEAM_NOT_VERIFIED')
    await setCheckIn(false)
  })

  it('a third person is refused (solo or duo)', async () => {
    const r = await request(app).post(`/api/teams/${teamId}/members`).set(auth(team)).send({ name: 'Third Person', email: 'third@x.com', phone: '9000000001', year: '1st Year' })
    expect(r.status).toBe(400)
  })

  it('changes requested: the team sees the note, and editing resubmits it for review', async () => {
    const rc = await request(app).patch(`/api/admin/teams/${teamId}/request-changes`).set(auth(admin)).send({ note: 'Remove the teammate' })
    expect(rc.body.team.verificationStatus).toBe('CHANGES_REQUIRED')
    const t = await me()
    expect(t.verificationHistory.at(-1)).toMatchObject({ status: 'CHANGES_REQUIRED', note: 'Remove the teammate' })
    const memberId = t.members[0].memberId
    const rm = await request(app).delete(`/api/teams/${teamId}/members/${memberId}`).set(auth(team))
    expect(rm.status).toBe(200)
    expect(rm.body.team.verificationStatus).toBe('PENDING')
    expect(rm.body.team.members).toHaveLength(0)
  })

  it('"Disable" actually does something now', async () => {
    await request(app).patch(`/api/admin/teams/${teamId}/verify`).set(auth(admin)).send({})
    // ADMIN can't disable (SUPER_ADMIN only) — the UI hides the button for them.
    expect((await request(app).patch(`/api/admin/teams/${teamId}/disable`).set(auth(admin))).status).toBe(403)
    expect((await request(app).patch(`/api/admin/teams/${teamId}/disable`).set(auth(superAdmin))).body.team.disabled).toBe(true)
    await setCheckIn(true)
    expect((await request(app).post('/api/admin/qr/verify').set(auth(admin)).send(qrParts(qrUrl))).body.code).toBe('TEAM_DISABLED')
    expect((await request(app).post(`/api/admin/teams/${teamId}/checkin`).set(auth(admin))).body.code).toBe('TEAM_DISABLED')
    expect((await request(app).post(`/api/teams/${teamId}/members`).set(auth(team)).send({ name: 'Late Add', email: 'late@x.com', phone: '9000000002', year: '1st Year' })).body.code).toBe('TEAM_DISABLED')
    await request(app).patch(`/api/admin/teams/${teamId}/disable`).set(auth(superAdmin))
  })

  it('only verified teams can be checked in, even via the bare-teamId endpoint', async () => {
    await request(app).patch(`/api/admin/teams/${teamId}/request-changes`).set(auth(admin)).send({})
    expect((await request(app).post(`/api/admin/teams/${teamId}/checkin`).set(auth(admin))).body.code).toBe('TEAM_NOT_VERIFIED')
    await request(app).patch(`/api/admin/teams/${teamId}/verify`).set(auth(admin)).send({})
  })

  it('checks in, after which it cannot be rejected or have its roster changed', async () => {
    const c = await request(app).post(`/api/admin/teams/${teamId}/checkin`).set(auth(admin))
    expect(c.status).toBe(201)
    const rej = await request(app).patch(`/api/admin/teams/${teamId}/reject`).set(auth(admin)).send({})
    expect(rej.status).toBe(409)
    expect(rej.body.code).toBe('ALREADY_CHECKED_IN')
    const add = await request(app).post(`/api/teams/${teamId}/members`).set(auth(team)).send({ name: 'Too Late', email: 'toolate@x.com', phone: '9000000003', year: '1st Year' })
    expect(add.status).toBe(400)
    const t = await me()
    expect(t.checkedIn).toBe(true)
    expect(t.verificationStatus).toBe('VERIFIED')
  })
})
