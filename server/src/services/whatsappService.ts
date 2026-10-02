/**
 * WhatsApp notifications via the Meta WhatsApp Cloud API. Server-side only: the access token
 * lives in env vars and never reaches the browser, logs, or API responses.
 *
 * Env:
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_RECIPIENT_NUMBER,
 *   WHATSAPP_API_VERSION (default v21.0), WHATSAPP_DEFAULT_COUNTRY_CODE (default 91),
 *   WHATSAPP_TEMPLATE_NAME / WHATSAPP_TEMPLATE_LANG (optional — see sendWhatsAppNotification).
 */

export interface WhatsAppResult {
  sent: boolean
  /** Short, non-sensitive reason when sent === false. */
  reason?: string
}

export interface ContactNotification {
  name: string
  email: string
  phone?: string
  message: string
  submittedAt: Date
}

const TIMEOUT_MS = 8000

/** Digits only, with the default country code prepended to bare national numbers (e.g. 9000000001 -> 919000000001). */
export function normalizeRecipient(raw: string, defaultCountryCode = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? '91'): string {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 10 ? `${defaultCountryCode}${digits}` : digits
}

export function formatContactMessage(n: ContactNotification): string {
  const ts = n.submittedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST'
  const lines = [
    '🔔 NEW CONTACT MESSAGE',
    '',
    '👤 Name:', n.name,
    '',
    '📧 Email:', n.email,
    '',
  ]
  if (n.phone) lines.push('📱 Phone:', n.phone, '')
  lines.push('💬 Message:', n.message, '', '🕒 Submitted At:', ts, '', '🌐 Source:', 'Matrix Vibe Coding 2.0 Website')
  return lines.join('\n')
}

async function postToCloudApi(payload: unknown): Promise<WhatsAppResult> {
  const { WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_VERSION = 'v21.0' } = process.env
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) return { sent: false, reason: 'not_configured' }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    if (!res.ok) {
      // Log status + Meta's error message only — never the request headers/token.
      let detail = ''
      try { detail = ((await res.json()) as { error?: { message?: string } })?.error?.message ?? '' } catch { /* no body */ }
      console.error(`[whatsapp] API responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
      return { sent: false, reason: `http_${res.status}` }
    }
    return { sent: true }
  } catch (err) {
    console.error('[whatsapp] request failed:', (err as Error)?.name === 'AbortError' ? 'timeout' : (err as Error)?.message)
    return { sent: false, reason: 'request_failed' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Sends the contact submission to WHATSAPP_RECIPIENT_NUMBER. NEVER throws: failures are logged
 * safely and returned as { sent: false } so callers can carry on.
 *
 * Mode: plain text by default. Meta only delivers free-form text if the recipient messaged the
 * business number within the last 24h; otherwise set WHATSAPP_TEMPLATE_NAME to an approved
 * template whose body has 5 variables: {{1}} name, {{2}} email, {{3}} phone, {{4}} message, {{5}} time.
 */
export async function sendWhatsAppNotification(n: ContactNotification): Promise<WhatsAppResult> {
  try {
    const recipient = process.env.WHATSAPP_RECIPIENT_NUMBER
    if (!recipient) return { sent: false, reason: 'not_configured' }
    const to = normalizeRecipient(recipient)

    const templateName = process.env.WHATSAPP_TEMPLATE_NAME
    if (templateName) {
      // Template variables may not contain newlines / long whitespace runs.
      const flat = (s: string) => s.replace(/\s+/g, ' ').trim() || '-'
      const when = n.submittedAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) + ' IST'
      return await postToCloudApi({
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? 'en' },
          components: [{ type: 'body', parameters: [n.name, n.email, n.phone ?? '', n.message, when].map((t) => ({ type: 'text', text: flat(t) })) }],
        },
      })
    }
    return await postToCloudApi({
      messaging_product: 'whatsapp', to, type: 'text',
      text: { preview_url: false, body: formatContactMessage(n).slice(0, 4000) },
    })
  } catch (err) {
    console.error('[whatsapp] unexpected error:', (err as Error)?.message)
    return { sent: false, reason: 'unexpected' }
  }
}
