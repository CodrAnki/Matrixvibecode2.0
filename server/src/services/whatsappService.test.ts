import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendWhatsAppNotification, formatContactMessage, normalizeRecipient } from './whatsappService.js'

const n = { name: 'Asha', email: 'asha@x.com', phone: '+91 98765 43210', message: 'Hello, I want to know about the Vibe Coding event.', submittedAt: new Date('2026-10-02T10:00:00Z') }

describe('whatsappService', () => {
  const env = { ...process.env }
  beforeEach(() => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    process.env.WHATSAPP_ACCESS_TOKEN = 'SECRET_TOKEN'
    process.env.WHATSAPP_RECIPIENT_NUMBER = '9000000001'
    delete process.env.WHATSAPP_TEMPLATE_NAME
  })
  afterEach(() => { process.env = { ...env }; vi.restoreAllMocks() })

  it('normalizes a bare 10-digit number with the country code', () => {
    expect(normalizeRecipient('9000000001', '91')).toBe('919000000001')
    expect(normalizeRecipient('+91 90000 00001', '91')).toBe('919000000001')
  })

  it('formats the exact message and phone only when present', () => {
    expect(formatContactMessage(n)).toContain('💬 Message:\nHello, I want to know about the Vibe Coding event.')
    expect(formatContactMessage({ ...n, phone: undefined })).not.toContain('📱 Phone')
  })

  it('POSTs to the Cloud API with the token in the header only', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', f)
    expect(await sendWhatsAppNotification(n)).toEqual({ sent: true })
    const [url, init] = f.mock.calls[0]
    expect(url).toContain('/123/messages')
    expect(init.headers.Authorization).toBe('Bearer SECRET_TOKEN')
    const body = JSON.parse(init.body)
    expect(body.to).toBe('919000000001')
    expect(body.text.body).toContain(n.message)
    expect(init.body).not.toContain('SECRET_TOKEN')
  })

  it('never throws or leaks the token on API failure', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { message: 'bad token' } }) }))
    expect(await sendWhatsAppNotification(n)).toEqual({ sent: false, reason: 'http_401' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    expect((await sendWhatsAppNotification(n)).sent).toBe(false)
    expect(JSON.stringify(err.mock.calls)).not.toContain('SECRET_TOKEN')
  })

  it('reports not_configured without calling fetch', async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    expect(await sendWhatsAppNotification(n)).toEqual({ sent: false, reason: 'not_configured' })
    expect(f).not.toHaveBeenCalled()
  })
})
