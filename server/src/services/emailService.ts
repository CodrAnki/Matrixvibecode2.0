import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

/** Masks a recipient for logs: "ankit@gmail.com" -> "a***@gmail.com". */
export function maskRecipient(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 1)}***@${domain}`
}

/** Extracts the bare address from either "a@b.c" or "Name <a@b.c>", lower-cased. */
function bareAddress(value: string): string {
  const m = value.match(/<([^>]+)>/)
  return (m ? m[1] : value).trim().toLowerCase()
}

/**
 * The From address. Gmail only delivers mail whose From matches the authenticated account, so an
 * SMTP_FROM that names any other address is ignored (with a warning) and SMTP_USER is used.
 */
export function resolveSender(env: Record<string, string | undefined> = process.env): string | null {
  const user = env.SMTP_USER?.trim()
  if (!user) return null
  const from = env.SMTP_FROM?.trim()
  if (!from) return user
  if (bareAddress(from) !== bareAddress(user)) {
    console.warn('[email] SMTP_FROM does not match SMTP_USER — using SMTP_USER as the sender')
    return user
  }
  return user
}

/** Lazily builds the SMTP transport from env vars. Never hardcode credentials. */
function getTransporter() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null

  const port = Number(SMTP_PORT) || 587
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 587 = STARTTLS (secure:false), 465 = implicit TLS
    requireTLS: port !== 465, // never fall back to plaintext on 587
    // Google shows App Passwords in groups separated by spaces; the spaces are not part of the secret.
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD.replace(/\s+/g, '') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // Certificate verification stays at nodemailer's secure default (no tls.rejectUnauthorized override).
  })
  return transporter
}

/**
 * Startup check: confirms the SMTP host is reachable and the credentials are accepted.
 * Never throws and never logs credentials — it only reports whether OTP email will work.
 */
export async function verifyEmailTransport(): Promise<void> {
  const t = getTransporter()
  if (!t) {
    console.warn('[email] SMTP is not fully configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD) — OTP emails cannot be sent')
    return
  }
  try {
    await t.verify()
    console.log('[email] SMTP connection verified')
  } catch (err) {
    const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code) : 'UNKNOWN'
    console.error(`[email] SMTP verification failed (${code}) — check SMTP_HOST, SMTP_PORT, SMTP_USER and the App Password`)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function otpEmailText(otp: string, expiresMinutes: number, reset = false): string {
  return [
    `Your Vibe Coding 2.0 ${reset ? 'password reset' : 'verification'} OTP is: ${otp}`,
    '',
    `This OTP is valid for ${expiresMinutes} minutes.`,
    '',
    'Do not share this OTP with anyone.',
    '',
    'If you did not request this OTP, you can safely ignore this email.',
    '',
    'Matrix Club',
    'Vibe Coding 2.0',
  ].join('\n')
}

/** Deliberately plain: no images, external CSS/fonts, scripts, tracking or links. */
function otpEmailHtml(otp: string, expiresMinutes: number, reset = false): string {
  const code = escapeHtml(otp)
  const kind = reset ? 'password reset' : 'verification'
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vibe Coding 2.0 - ${reset ? 'Password Reset' : 'Verification'} OTP</title>
</head>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#222222;">
<div style="max-width:480px;margin:0 auto;">
<p>Your Vibe Coding 2.0 ${kind} OTP is:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px;margin:16px 0;">${code}</p>
<p>This OTP is valid for ${expiresMinutes} minutes.</p>
<p>Do not share this OTP with anyone.</p>
<p>If you did not request this OTP, you can safely ignore this email.</p>
<p>Matrix Club<br>Vibe Coding 2.0</p>
</div>
</body>
</html>`
}

/** Sends the OTP email. Throws on failure — callers must NOT establish a session if this throws. */
export async function sendOtpEmail(to: string, otp: string, expiresMinutes: number, purpose: 'AUTH' | 'PASSWORD_RESET' = 'AUTH'): Promise<void> {
  const reset = purpose === 'PASSWORD_RESET'
  const t = getTransporter()

  if (!t) {
    // No SMTP configured. In production this must be a hard failure — never a silent OTP log.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — cannot send OTP email')
    }
    // Local-dev convenience ONLY: without SMTP configured there is no way to see the code
    // otherwise. This branch never runs in production (guarded above) — see spec's "never log
    // OTP in production" requirement.
    console.warn(`[dev-only, SMTP not configured] OTP for ${to}: ${otp} (expires in ${expiresMinutes}m)`)
    return
  }

  try {
    await t.sendMail({
      from: resolveSender() ?? undefined,
      to,
      subject: reset ? 'Vibe Coding 2.0 - Password Reset OTP' : 'Vibe Coding 2.0 - Verification OTP',
      text: otpEmailText(otp, expiresMinutes, reset),
      html: otpEmailHtml(otp, expiresMinutes, reset),
      headers: { 'X-Priority': '3', 'X-Mailer': 'Matrix Vibe Coding 2.0' },
    })
  } catch (err) {
    const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code) : 'UNKNOWN'
    console.error(`[email] OTP email failed for ${maskRecipient(to)} (${code})`)
    throw err
  }
  console.log(`[email] OTP email sent successfully to masked recipient: ${maskRecipient(to)}`)
}
