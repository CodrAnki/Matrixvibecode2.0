/**
 * End-to-end API test: Admin → create → MongoDB → publish → PUBLIC GET /api/announcements → edit →
 * unpublish → delete, plus security checks. Needs a real MongoDB (MongoDB-wire-compatible is fine):
 *   E2E_MONGODB_URI=mongodb://localhost:27017/matrix_e2e npm test
 * Skipped automatically when E2E_MONGODB_URI is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import type { Express } from 'express'

const URI = process.env.E2E_MONGODB_URI
const d = URI ? describe : describe.skip

d('Announcements end-to-end', () => {
  let app: Express
  let admin = ''
  let team = ''
  let id = ''
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` })

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-secret'
    process.env.NODE_ENV = 'test'
    await mongoose.connect(URI!)
    const { createApp } = await import('./app.js')
    const { User } = await import('./models/User.js')
    const { Announcement } = await import('./models/Announcement.js')
    const { signToken } = await import('./utils/generateToken.js')
    await Announcement.deleteMany({})
    await User.deleteMany({ email: { $in: ['e2e-admin@x.com', 'e2e-team@x.com'] } })
    const a = await User.create({ name: 'E2E Admin', email: 'e2e-admin@x.com', passwordHash: 'x', role: 'ADMIN' })
    const t = await User.create({ name: 'E2E Team', email: 'e2e-team@x.com', passwordHash: 'x', role: 'TEAM_LEADER' })
    admin = signToken({ id: String(a._id), role: 'ADMIN' })
    team = signToken({ id: String(t._id), role: 'TEAM_LEADER' })
    app = createApp()
  })
  afterAll(async () => {
    const { User } = await import('./models/User.js')
    const { Announcement } = await import('./models/Announcement.js')
    await Announcement.deleteMany({})
    await User.deleteMany({ email: { $in: ['e2e-admin@x.com', 'e2e-team@x.com'] } })
    await mongoose.disconnect()
  })

  const publicList = async () => (await request(app).get('/api/announcements')).body.announcements as { _id: string; title: string; message: string }[]

  it('blocks unauthenticated and non-admin users from admin announcement APIs', async () => {
    expect((await request(app).get('/api/admin/announcements')).status).toBe(401)
    expect((await request(app).post('/api/admin/announcements').send({ title: 'xxx', message: 'yyy' })).status).toBe(401)
    expect((await request(app).get('/api/admin/announcements').set(auth(team))).status).toBe(403)
    expect((await request(app).post('/api/admin/announcements').set(auth(team)).send({ title: 'xxx', message: 'yyy' })).status).toBe(403)
    expect((await request(app).delete('/api/admin/announcements/507f1f77bcf86cd799439011').set(auth(team))).status).toBe(403)
  })

  it('validates and sanitizes input', async () => {
    expect((await request(app).post('/api/admin/announcements').set(auth(admin)).send({ title: '', message: 'hello there' })).status).toBe(400)
    expect((await request(app).post('/api/admin/announcements').set(auth(admin)).send({ title: 'Valid', message: '' })).status).toBe(400)
    expect((await request(app).post('/api/admin/announcements').set(auth(admin)).send({ title: 'Valid', message: 'ok ok', type: 'NOPE' })).status).toBe(400)
    const r = await request(app).post('/api/admin/announcements').set(auth(admin)).send({ title: '<b>Safe</b> title', message: 'Hi <script>alert(1)</script><img src=x onerror=alert(1)> there', status: 'DRAFT' })
    expect(r.status).toBe(201)
    expect(r.body.announcement.title).toBe('Safe title')
    expect(r.body.announcement.message).not.toMatch(/[<>]/)
    expect(r.body.announcement.message).not.toMatch(/alert/)
    await request(app).delete(`/api/admin/announcements/${r.body.announcement._id}`).set(auth(admin))
  })

  it('create (DRAFT) → stored in MongoDB → NOT visible publicly', async () => {
    const r = await request(app).post('/api/admin/announcements').set(auth(admin)).send({
      title: 'Round 1 has started', message: 'All teams can now begin their submission.', type: 'IMPORTANT', priority: 'URGENT', status: 'DRAFT',
    })
    expect(r.status).toBe(201)
    id = r.body.announcement._id
    expect(r.body.announcement.status).toBe('DRAFT')
    const { Announcement } = await import('./models/Announcement.js')
    expect(await Announcement.countDocuments({ _id: id })).toBe(1) // really in MongoDB
    expect((await publicList()).find((a) => a._id === id)).toBeUndefined()
  })

  it('publish → public GET /api/announcements (no login) shows it', async () => {
    const r = await request(app).patch(`/api/admin/announcements/${id}/publish`).set(auth(admin))
    expect(r.status).toBe(200)
    expect(r.body.announcement.status).toBe('PUBLISHED')
    expect(r.body.announcement.publishedAt).toBeTruthy()
    const found = (await publicList()).find((a) => a._id === id)
    expect(found?.title).toBe('Round 1 has started')
    expect(found?.message).toBe('All teams can now begin their submission.')
  })

  it('edit → public announcement updated', async () => {
    const r = await request(app).put(`/api/admin/announcements/${id}`).set(auth(admin)).send({ title: 'Round 1 is LIVE', message: 'Submissions open until 6 PM.' })
    expect(r.status).toBe(200)
    expect(r.body.announcement.status).toBe('PUBLISHED')
    const found = (await publicList()).find((a) => a._id === id)
    expect(found?.title).toBe('Round 1 is LIVE')
    expect(found?.message).toBe('Submissions open until 6 PM.')
  })

  it('unpublish → disappears from public site, stays in admin list as UNPUBLISHED', async () => {
    const r = await request(app).patch(`/api/admin/announcements/${id}/unpublish`).set(auth(admin))
    expect(r.status).toBe(200)
    expect((await publicList()).find((a) => a._id === id)).toBeUndefined()
    const list = await request(app).get('/api/admin/announcements').set(auth(admin))
    expect(list.body.announcements.find((a: { _id: string }) => a._id === id).status).toBe('UNPUBLISHED')
  })

  it('scheduled (future publishedAt) stays hidden; expired stays hidden', async () => {
    const future = new Date(Date.now() + 3600_000).toISOString()
    const s = await request(app).post('/api/admin/announcements').set(auth(admin)).send({ title: 'Scheduled one', message: 'later on', status: 'PUBLISHED', publishedAt: future })
    expect(s.status).toBe(201)
    const e = await request(app).post('/api/admin/announcements').set(auth(admin)).send({ title: 'Expired one', message: 'too late', status: 'PUBLISHED', expiresAt: new Date(Date.now() - 1000).toISOString() })
    const pub = await publicList()
    expect(pub.find((a) => a._id === s.body.announcement._id)).toBeUndefined()
    expect(pub.find((a) => a._id === e.body.announcement._id)).toBeUndefined()
  })

  it('admin search / filter + dashboard stats', async () => {
    const byQ = await request(app).get('/api/admin/announcements?q=scheduled').set(auth(admin))
    expect(byQ.body.announcements.length).toBe(1)
    const byStatus = await request(app).get('/api/admin/announcements?status=UNPUBLISHED').set(auth(admin))
    expect(byStatus.body.announcements.every((a: { status: string }) => a.status === 'UNPUBLISHED')).toBe(true)
    // The dashboard endpoint also runs an older $dateToString chart aggregation that FerretDB lacks;
    // set E2E_SKIP_DASHBOARD=1 when testing against FerretDB. On real MongoDB leave it unset.
    if (!process.env.E2E_SKIP_DASHBOARD) {
      const dash = await request(app).get('/api/admin/dashboard').set(auth(admin))
      expect(dash.status).toBe(200)
      expect(dash.body.stats.totalAnnouncements).toBeGreaterThanOrEqual(3)
      expect(dash.body.stats.publishedAnnouncements).toBeGreaterThanOrEqual(2)
      expect(dash.body.stats.latestAnnouncement.title).toBeTruthy()
    } else {
      const { Announcement } = await import('./models/Announcement.js')
      expect(await Announcement.countDocuments()).toBeGreaterThanOrEqual(3)
      expect(await Announcement.countDocuments({ status: 'PUBLISHED' })).toBeGreaterThanOrEqual(2)
      expect(await Announcement.countDocuments({ status: 'DRAFT' })).toBeGreaterThanOrEqual(0)
      expect((await Announcement.findOne().sort({ createdAt: -1 }).lean())?.title).toBeTruthy()
    }
  })

  it('re-publish works, then delete removes it everywhere', async () => {
    await request(app).patch(`/api/admin/announcements/${id}/publish`).set(auth(admin))
    expect((await publicList()).find((a) => a._id === id)).toBeDefined()
    const del = await request(app).delete(`/api/admin/announcements/${id}`).set(auth(admin))
    expect(del.status).toBe(200)
    expect((await publicList()).find((a) => a._id === id)).toBeUndefined()
    const list = await request(app).get('/api/admin/announcements').set(auth(admin))
    expect(list.body.announcements.find((a: { _id: string }) => a._id === id)).toBeUndefined()
    expect((await request(app).delete(`/api/admin/announcements/${id}`).set(auth(admin))).status).toBe(404)
  })

  it('migrates legacy {body, published} documents', async () => {
    const { Announcement, migrateLegacyAnnouncements } = await import('./models/Announcement.js')
    await Announcement.collection.insertOne({ title: 'Old one', body: 'legacy text', type: 'URGENT', published: true, createdAt: new Date(), updatedAt: new Date() })
    expect(await migrateLegacyAnnouncements()).toBe(1)
    const found = (await publicList()).find((a) => a.title === 'Old one')
    expect(found?.message).toBe('legacy text')
  })
})
