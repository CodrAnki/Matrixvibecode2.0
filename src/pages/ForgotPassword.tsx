import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import MagneticButton from '../components/MagneticButton'
import * as resetApi from '../api/passwordResetApi'
import { ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { isEmail } from '../lib/validate'

type Step = 'email' | 'otp' | 'password' | 'done'

const RESEND_SECONDS = 60
const DEFAULT_EXPIRY_SECONDS = 5 * 60
const REDIRECT_AFTER_MS = 4000
// Server answers that mean "this OTP session is finished — a fresh code is needed", not "try the same code again".
const DEAD_SESSION = new Set(['OTP_EXPIRED', 'OTP_MAX_ATTEMPTS', 'INVALID_VERIFICATION_ID', 'OTP_ALREADY_USED'])
// Server answers that mean "the reset session is over — start again from the email step".
const RESET_SESSION_OVER = new Set(['RESET_TOKEN_EXPIRED', 'RESET_TOKEN_INVALID'])

const errText = (x: unknown, fallback: string) => (x instanceof ApiError ? x.message : fallback)
const errBox = 'rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'

/** Same rules the server enforces: 8–128 characters with at least one letter and one number. */
function passwordProblem(pw: string): string {
  if (!pw) return 'Enter a new password.'
  if (pw.length < 8) return 'Password must be at least 8 characters.'
  if (pw.length > 128) return 'Password must be 128 characters or fewer.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Use at least one letter and one number.'
  return ''
}

export default function ForgotPassword() {
  const { team } = useAuth()
  const nav = useNavigate()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [verificationId, setVerificationId] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [resetToken, setResetToken] = useState('')

  // email step
  const [emailErr, setEmailErr] = useState('')
  // otp step
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [cooldown, setCooldown] = useState(0)
  const [expiresIn, setExpiresIn] = useState(DEFAULT_EXPIRY_SECONDS)
  const [deadSession, setDeadSession] = useState(false)
  const [info, setInfo] = useState('')
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  // password step
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [pwErr, setPwErr] = useState('')
  const [pw2Err, setPw2Err] = useState('')
  const [sessionOver, setSessionOver] = useState(false)

  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // sync guard: `busy` lags a render, so a double click could send two requests / two emails

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  useEffect(() => {
    if (step !== 'otp' || expiresIn <= 0) return
    const t = setInterval(() => setExpiresIn((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [step, expiresIn])

  useEffect(() => {
    if (step !== 'done') return
    const t = window.setTimeout(() => nav('/login', { replace: true, state: { passwordReset: true } }), REDIRECT_AFTER_MS)
    return () => window.clearTimeout(t)
  }, [step, nav])

  if (team) return <Navigate to="/dashboard" replace />

  /** Runs one request at a time; always releases the guard. */
  const run = async (fn: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true)
    try { await fn() } finally { inFlight.current = false; setBusy(false) }
  }

  const startOtpStep = (res: resetApi.ResetOtpEnvelope) => {
    setVerificationId(res.verificationId)
    setMaskedEmail(res.maskedEmail)
    setDigits(Array(6).fill(''))
    setCooldown(RESEND_SECONDS)
    setExpiresIn(res.expiresInSeconds || DEFAULT_EXPIRY_SECONDS)
    setDeadSession(false)
    setStep('otp')
    window.setTimeout(() => inputsRef.current[0]?.focus(), 0)
  }

  /* ---------- Step 1: email ---------- */
  const submitEmail = (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) return setEmailErr('Enter a valid email address.')
    setEmailErr(''); setErr(''); setInfo('')
    void run(async () => {
      try { startOtpStep(await resetApi.requestPasswordReset(email.trim().toLowerCase())) }
      catch (x) { setErr(errText(x, 'Could not send the code. Please try again.')) }
    })
  }

  /* ---------- Step 2: OTP ---------- */
  const code = digits.join('')
  const mmss = `${String(Math.floor(expiresIn / 60)).padStart(2, '0')}:${String(expiresIn % 60).padStart(2, '0')}`

  const handleChange = (i: number, raw: string) => {
    const val = raw.replace(/\D/g, '')
    if (!val) { setDigits((d) => { const n = [...d]; n[i] = ''; return n }); return }
    setDigits((d) => { const n = [...d]; n[i] = val[val.length - 1]; return n })
    if (i < 5) inputsRef.current[i + 1]?.focus()
  }
  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus()
  }
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    setDigits((d) => { const n = [...d]; for (let i = 0; i < 6; i++) n[i] = text[i] ?? n[i]; return n })
    inputsRef.current[Math.min(text.length, 5)]?.focus()
  }

  const verify = () => {
    if (code.length !== 6) return setErr('Enter the full 6-digit code.')
    setErr(''); setInfo('')
    void run(async () => {
      try {
        const res = await resetApi.verifyPasswordResetOtp(verificationId, code)
        setResetToken(res.resetToken)
        setPw(''); setPw2(''); setPwErr(''); setPw2Err(''); setSessionOver(false)
        setStep('password')
      } catch (x) {
        setErr(errText(x, 'Something went wrong. Please try again.'))
        if (x instanceof ApiError && x.code && DEAD_SESSION.has(x.code)) {
          // This code can no longer be used — only a fresh one will do.
          setDeadSession(true); setCooldown(0); setExpiresIn(0)
        } else {
          setDigits(Array(6).fill('')) // wrong code: clear the boxes so the next try starts clean
          inputsRef.current[0]?.focus()
        }
      }
    })
  }

  /** Resend inside a live session (server cooldown applies); if the session is already dead, start a fresh one. */
  const sendNewCode = () => {
    if (!deadSession && cooldown > 0) return
    setErr(''); setInfo('')
    void run(async () => {
      try {
        const res = deadSession ? await resetApi.requestPasswordReset(email.trim().toLowerCase()) : await resetApi.resendPasswordResetOtp(verificationId)
        startOtpStep(res)
        setInfo('A new code has been sent to your email.')
      } catch (x) {
        if (x instanceof ApiError && x.code === 'INVALID_VERIFICATION_ID' && !deadSession) {
          // The old session expired server-side — a plain "send again" is what the user wants.
          try { startOtpStep(await resetApi.requestPasswordReset(email.trim().toLowerCase())); setInfo('A new code has been sent to your email.'); return }
          catch (y) { setErr(errText(y, 'Could not send a new code. Please try again.')); setDeadSession(true); return }
        }
        if (x instanceof ApiError && x.code === 'RESEND_COOLDOWN') setCooldown(RESEND_SECONDS)
        setErr(errText(x, 'Could not send a new code. Please try again.'))
      }
    })
  }

  /* ---------- Step 3: new password ---------- */
  const submitPassword = (e: FormEvent) => {
    e.preventDefault()
    const p1 = passwordProblem(pw)
    const p2 = !pw2 ? 'Confirm your new password.' : pw !== pw2 ? 'Passwords do not match.' : ''
    setPwErr(p1); setPw2Err(p2); setErr('')
    if (p1 || p2) return
    void run(async () => {
      try {
        await resetApi.resetPassword(resetToken, pw)
        setResetToken(''); setPw(''); setPw2('')
        setStep('done')
      } catch (x) {
        const code = x instanceof ApiError ? x.code : undefined
        if (code && RESET_SESSION_OVER.has(code)) { setSessionOver(true); setErr(errText(x, 'Your reset session has expired. Please start again.')) }
        else if (code === 'WEAK_PASSWORD' || code === 'SAME_PASSWORD' || code === 'VALIDATION_ERROR') setPwErr(errText(x, 'Choose a different password.'))
        else setErr(errText(x, 'Could not change your password. Please try again.'))
      }
    })
  }

  const startOver = () => {
    setStep('email'); setErr(''); setInfo(''); setSessionOver(false)
    setVerificationId(''); setResetToken(''); setDigits(Array(6).fill('')); setPw(''); setPw2('')
  }
  const goLogin = () => nav('/login', { replace: true, state: { passwordReset: true } })

  /* ---------- Render ---------- */
  if (step === 'email') {
    return (
      <AuthShell kicker="Access terminal" title="Forgot password" sub="Enter your registered team email and we'll send you a 6-digit code to reset your password.">
        <form onSubmit={submitEmail} className="grid gap-5" noValidate>
          <Field label="Email" type="email" autoComplete="email" placeholder="leader@college.edu" value={email} error={emailErr} onChange={(e) => setEmail(e.target.value)} />
          {err && <p role="alert" className={errBox}>{err}</p>}
          <MagneticButton type="submit" variant="solid" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send OTP'}</MagneticButton>
          <p className="text-center text-sm text-slate-400"><button type="button" onClick={() => nav('/login')} className="text-cyan-300 hover:underline">← Back to login</button></p>
        </form>
      </AuthShell>
    )
  }

  if (step === 'otp') {
    return (
      <AuthShell kicker="Access terminal" title="Verify your email" sub={maskedEmail ? `We sent a 6-digit code to ${maskedEmail}` : "We've sent a 6-digit code to your registered email."}>
        <div className="grid gap-5">
          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputsRef.current[i] = el }}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                className="field h-14 w-full text-center text-xl font-mono tracking-widest"
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {err && <p role="alert" className={errBox}>{err}</p>}
          {info && !err && <p className="text-sm text-emerald-300">{info}</p>}

          <p className="text-center font-mono text-xs text-slate-500">
            {expiresIn > 0 ? <>OTP expires in {mmss}</> : <span className="text-rose-300">OTP has expired — request a new one below.</span>}
          </p>

          <MagneticButton onClick={verify} variant="solid" disabled={busy || code.length !== 6 || expiresIn <= 0} className="w-full justify-center">
            {busy ? 'Verifying…' : 'Verify OTP'}
          </MagneticButton>

          <div className="text-center text-sm text-slate-400">
            {!deadSession && cooldown > 0 ? (
              <span>Resend OTP in {cooldown}s</span>
            ) : (
              <button type="button" onClick={sendNewCode} disabled={busy} className="text-cyan-300 hover:underline disabled:opacity-50">
                {busy ? 'Sending…' : deadSession ? 'Send a new code' : 'Resend OTP'}
              </button>
            )}
          </div>

          <button type="button" onClick={startOver} className="text-center text-xs text-slate-500 hover:text-slate-300">← Use a different email</button>
        </div>
      </AuthShell>
    )
  }

  if (step === 'password') {
    return (
      <AuthShell kicker="Access terminal" title="New password" sub="Code verified. Choose a new password for your team account.">
        <form onSubmit={submitPassword} className="grid gap-5" noValidate>
          <Field label="New Password" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={pw} error={pwErr} hint="At least 8 characters, with a letter and a number." onChange={(e) => setPw(e.target.value)} />
          <Field label="Confirm Password" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={pw2} error={pw2Err} onChange={(e) => setPw2(e.target.value)} />
          <button type="button" onClick={() => setShow((s) => !s)} className="justify-self-start font-mono text-[0.6rem] uppercase tracking-widest text-cyan-300/80 hover:text-cyan-100">{show ? 'Hide passwords' : 'Show passwords'}</button>
          {err && <p role="alert" className={errBox}>{err}</p>}
          {sessionOver
            ? <MagneticButton onClick={startOver} variant="solid" className="w-full">Start again</MagneticButton>
            : <MagneticButton type="submit" variant="solid" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Change password'}</MagneticButton>}
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell kicker="Access terminal" title="Password changed" sub="Your password has been updated. Sign in with your new password.">
      <div className="grid gap-5">
        <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">Your password was reset successfully.</p>
        <MagneticButton onClick={goLogin} variant="solid" className="w-full">Back to login</MagneticButton>
        <p className="text-center text-xs text-slate-500">Taking you to the login page…</p>
      </div>
    </AuthShell>
  )
}
