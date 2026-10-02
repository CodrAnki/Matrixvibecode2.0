/** Needs a real MongoDB: E2E_MONGODB_URI=mongodb://localhost:27017/matrix_e2e npm test. Skipped otherwise. */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import mongoose from 'mongoose'
import type { Express } from 'express'

const URI = process.env.E2E_MONGODB_URI
const d = URI ? describe : describe.skip

d('Contact form → WhatsApp (e2e)', () => {
  let app: Express
  const fetchMock = vi.fn()
  const good = { name: 'Asha', email: 'asha@x.com', message: 'Hello, I want to know about the Vibe Coding event.' }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'e2e'; process.env.NODE_ENV = 'test'
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1'; process.env.WHATSAPP_ACCESS_TOKEN = 'T'; process.env.WHATSAPP_RECIPIENT_NUMBER = '9000000001'
    vi.stubGlobal('fetch', fetchMock)
    await mongoose.connect(URI!)
    app = (await import('./app.js')).createApp()
  })
  afterAll(async () => { await mongoose.disconnect() })

  it('stores, sends the exact message to 919000000001, and succeeds', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true })
    const r = await request(app).post('/api/contact').send(good)
    expect(r.status).toBe(201)
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.to).toBe('919000000001')
    expect(sent.text.body).toContain(good.message)
  })
  it('still succeeds (and hides the error) when WhatsApp fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    const r = await request(app).post('/api/contact').send(good)
    expect(r.status).toBe(201)
    expect(JSON.stringify(r.body)).not.toMatch(/token|whatsapp|500/i)
  })
  it('rejects empty message, bad email, long message, non-object fields', async () => {
    for (const bad of [{ ...good, message: '' }, { ...good, email: 'nope' }, { ...good, message: 'x'.repeat(1001) }, { ...good, name: { $gt: '' } }]) {
      expect((await request(app).post('/api/contact').send(bad)).status).toBe(400)
    }
  })
  it('honeypot submissions never reach WhatsApp', async () => {
    fetchMock.mockClear()
    const r = await request(app).post('/api/contact').send({ ...good, website: 'spam.com' })
    expect(r.status).toBe(201)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
