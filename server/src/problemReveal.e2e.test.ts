/**
 * End-to-end API test for the problem-statement reveal gate: nothing leaks publicly before the
 * official reveal (not even to a team faking an admin preview), admins can preview, and only admins
 * can flip the switch. Needs a dedicated MongoDB — it clears problem statements and event settings:
 *   E2E_MONGODB_URI=mongodb://localhost:27017/matrix_e2e npm test
 * Skipped automatically when E2E_MONGODB_URI is not set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import type { Express } from 'express'

const URI = process.env.E2E_MONGODB_URI
const d = URI ? describe : describe.skip

d('Problem statement reveal', () => {
  let app: Express
  let admin = ''
  let team = ''
  let publishedId = ''
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` })
  const titles = (r: request.Response) => (r.body.problems as { title: string }[]).map((p) => p.title)

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e-secret'
    process.env.NODE_ENV = 'test'
    await mongoose.connect(URI!)
    const { createApp } = await import('./app.js')
    const { User } = await import('./models/User.js')
    const { ProblemStatement } = await import('./models/ProblemStatement.js')
    const { EventSettings } = await import('./models/Event.js')
    const { signToken } = await import('./utils/generateToken.js')
    await ProblemStatement.deleteMany({})
    await EventSettings.deleteMany({})
    await User.deleteMany({ email: { $in: ['e2e-reveal-admin@x.com', 'e2e-reveal-team@x.com'] } })
    const a = await User.create({ name: 'E2E Admin', email: 'e2e-reveal-admin@x.com', passwordHash: 'x', role: 'ADMIN' })
    const t = await User.create({ name: 'E2E Team', email: 'e2e-reveal-team@x.com', passwordHash: 'x', role: 'TEAM_LEADER' })
    admin = signToken({ id: String(a._id), role: 'ADMIN' })
    team = signToken({ id: String(t._id), role: 'TEAM_LEADER' })
    app = createApp()

    const pub = await request(app).post('/api/admin/problems').set(auth(admin)).send({ title: 'Published brief', isPublished: true })
    publishedId = pub.body.problem._id
    await request(app).post('/api/admin/problems').set(auth(admin)).send({ title: 'Draft brief' })
  })
  afterAll(async () => {
    const { User } = await import('./models/User.js')
    const { ProblemStatement } = await import('./models/ProblemStatement.js')
    const { EventSettings } = await import('./models/Event.js')
    await ProblemStatement.deleteMany({})
    await EventSettings.deleteMany({})
    await User.deleteMany({ email: { $in: ['e2e-reveal-admin@x.com', 'e2e-reveal-team@x.com'] } })
    await mongoose.disconnect()
  })

  it('returns nothing publicly before the reveal, even for published problems', async () => {
    const state = await request(app).get('/api/event/state')
    expect(state.body.problemsRevealed).toBe(false)

    const r = await request(app).get('/api/problems')
    expect(r.status).toBe(200)
    expect(r.body.revealed).toBe(false)
    expect(r.body.problems).toEqual([])
    expect(r.headers['cache-control']).toMatch(/no-store/)
  })

  it('ignores ?preview=1 from anyone who is not an admin', async () => {
    expect((await request(app).get('/api/problems?preview=1')).body.problems).toEqual([])
    expect((await request(app).get('/api/problems?preview=1').set(auth(team))).body.problems).toEqual([])
    expect((await request(app).get('/api/problems?preview=1').set(auth('not-a-real-token'))).body.problems).toEqual([])
  })

  it('lets a signed-in admin preview published problems (never drafts) before the reveal', async () => {
    const r = await request(app).get('/api/problems?preview=1').set(auth(admin))
    expect(r.body.preview).toBe(true)
    expect(r.body.revealed).toBe(false)
    expect(titles(r)).toEqual(['Published brief'])
    // Without the flag an admin sees the participant view too.
    expect((await request(app).get('/api/problems').set(auth(admin))).body.problems).toEqual([])
  })

  it('blocks teams from selecting a problem before the reveal', async () => {
    const r = await request(app).post('/api/teams/me/problem').set(auth(team)).send({ problemId: publishedId })
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('NOT_REVEALED')
  })

  it('only lets admins flip the reveal', async () => {
    expect((await request(app).patch('/api/admin/event/reveal').send({ revealed: true })).status).toBe(401)
    expect((await request(app).patch('/api/admin/event/reveal').set(auth(team)).send({ revealed: true })).status).toBe(403)
    expect((await request(app).patch('/api/admin/event/reveal').set(auth(admin)).send({ revealed: 'yes' })).status).toBe(400)
    expect((await request(app).get('/api/event/state')).body.problemsRevealed).toBe(false)
  })

  it('refuses to reveal when nothing is published', async () => {
    await request(app).patch(`/api/admin/problems/${publishedId}/unpublish`).set(auth(admin))
    const r = await request(app).patch('/api/admin/event/reveal').set(auth(admin)).send({ revealed: true })
    expect(r.status).toBe(400)
    expect(r.body.code).toBe('NOTHING_TO_REVEAL')
    await request(app).patch(`/api/admin/problems/${publishedId}/publish`).set(auth(admin))
  })

  it('reveal exposes published problems to everyone; hiding pulls them back', async () => {
    const on = await request(app).patch('/api/admin/event/reveal').set(auth(admin)).send({ revealed: true })
    expect(on.status).toBe(200)
    expect(on.body.problemsRevealedAt).toBeTruthy()
    expect((await request(app).get('/api/event/state')).body.problemsRevealed).toBe(true)

    const pub = await request(app).get('/api/problems')
    expect(pub.body.revealed).toBe(true)
    expect(titles(pub)).toEqual(['Published brief'])

    const admin1 = await request(app).get('/api/admin/event').set(auth(admin))
    expect(admin1.body.publishedCount).toBe(1)
    expect(admin1.body.draftCount).toBe(1)

    await request(app).patch('/api/admin/event/reveal').set(auth(admin)).send({ revealed: false })
    expect((await request(app).get('/api/problems')).body.problems).toEqual([])
  })

  describe('registration closing', () => {
    const closed = async () => {
      const r = await request(app).post('/api/auth/register').send({})
      expect(r.status).toBe(403)
      expect(r.body.code).toBe('REGISTRATION_CLOSED')
      expect((await request(app).get('/api/event/state')).body.registrationOpen).toBe(false)
    }

    it('is open before the event starts', async () => {
      expect((await request(app).get('/api/event/state')).body.registrationOpen).toBe(true)
      // Open means the request gets as far as validation, not the closed check.
      expect((await request(app).post('/api/auth/register').send({})).body.code).not.toBe('REGISTRATION_CLOSED')
    })

    it('closes once the event has started', async () => {
      process.env.REGISTRATION_CLOSES_AT = new Date(Date.now() - 1000).toISOString()
      try { await closed() } finally { delete process.env.REGISTRATION_CLOSES_AT }
    })

    it('closes early when an admin switches registration off', async () => {
      const { EventSettings } = await import('./models/Event.js')
      await EventSettings.updateOne({}, { registrationOpen: false }, { upsert: true })
      try { await closed() } finally { await EventSettings.updateOne({}, { registrationOpen: true }) }
    })
  })
})
