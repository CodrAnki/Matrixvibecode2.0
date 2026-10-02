import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import MagneticButton from '../components/MagneticButton'
import * as otpApi from '../api/otpApi'
import { ApiError } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useAdminAuth } from '../admin/AdminAuthContext'

type Flow = 'team' | 'admin'
interface NavState { verificationId: string; maskedEmail?: string; expiresInSeconds?: number; flow: Flow; from?: string }

const RESEND_SECONDS = 60
const DEFAULT_EXPIRY_SECONDS = 5 * 60
const STORAGE_KEY = 'mvc2_otp_session'

/** Kept in sessionStorage (NOT localStorage, NOT the JWT itself) so a reload of this page during
 * the ~5-minute OTP window doesn't strand the user — router state alone is lost on reload. */
function readStashedState(): NavState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NavState) : null
  } catch {
    return null
  }
}

export default function VerifyOtp() {
  const loc = useLocation()
  const nav = useNavigate()
  const auth = useAuth()
  const adminAuth = useAdminAuth()

  const [session, setSession] = useState<NavState | null>(() => (loc.state as NavState | null) ?? readStashedState())
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const resendInFlight = useRef(false) // sync guard: a double click must not fire two resend requests
  const [resendMessage, setResendMessage] = useState('')
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const [expiresIn, setExpiresIn] = useState((loc.state as NavState | null)?.expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }, [session])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  useEffect(() => {
    if (expiresIn <= 0) return
    const t = setInterval(() => setExpiresIn((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [expiresIn])

  if (!session) {
    return (
      <AuthShell kicker="Access terminal" title="Verification expired" sub="We couldn't find a pending login. Please sign in again.">
        <div className="grid gap-3">
          <MagneticButton to="/login" variant="solid" className="w-full justify-center">Team login</MagneticButton>
          <MagneticButton to="/admin/login" className="w-full justify-center">Admin login</MagneticButton>
        </div>
      </AuthShell>
    )
  }

  const finish = (verificationId: string, maskedEmail?: string, expiresInSeconds?: number) => {
    setSession((s) => (s ? { ...s, verificationId, maskedEmail: maskedEmail ?? s.maskedEmail } : s))
    setDigits(Array(6).fill(''))
    setError('')
    setCooldown(RESEND_SECONDS)
    setExpiresIn(expiresInSeconds ?? DEFAULT_EXPIRY_SECONDS)
    inputsRef.current[0]?.focus()
  }

  const clearAndGo = (path: string) => {
    sessionStorage.removeItem(STORAGE_KEY)
    nav(path, { replace: true })
  }

  const handleChange = (i: number, raw: string) => {
    const val = raw.replace(/\D/g, '')
    if (!val) {
      setDigits((d) => { const next = [...d]; next[i] = ''; return next })
      return
    }
    setDigits((d) => {
      const next = [...d]
      next[i] = val[val.length - 1]
      return next
    })
    if (i < 5) inputsRef.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputsRef.current[i - 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    setDigits((d) => {
      const next = [...d]
      for (let i = 0; i < 6; i++) next[i] = text[i] ?? next[i]
      return next
    })
    inputsRef.current[Math.min(text.length, 5)]?.focus()
  }

  const otpCode = digits.join('')
  const mmss = `${String(Math.floor(expiresIn / 60)).padStart(2, '0')}:${String(expiresIn % 60).padStart(2, '0')}`

  const verify = async () => {
    if (otpCode.length !== 6) return setError('Enter the full 6-digit code.')
    setBusy(true); setError('')
    try {
      const { user, team } = await otpApi.verifyOtp(session.verificationId, otpCode)
      sessionStorage.removeItem(STORAGE_KEY)
      if (user.role === 'TEAM_LEADER' || user.role === 'TEAM_MEMBER') {
        if (team) auth.hydrate(user, team)
        nav(session.from || '/dashboard', { replace: true })
      } else {
        adminAuth.hydrate(user)
        nav('/admin', { replace: true })
      }
    } catch (x) {
      setError(x instanceof ApiError ? x.message : 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0 || resendBusy || resendInFlight.current) return
    resendInFlight.current = true
    setResendBusy(true); setError(''); setResendMessage('')
    try {
      const res = await otpApi.resendOtp(session.verificationId)
      finish(res.verificationId, res.maskedEmail, res.expiresInSeconds)
      setResendMessage('A new code has been sent to your email.')
    } catch (x) {
      setError(x instanceof ApiError ? x.message : 'Could not resend OTP. Please try again.')
    } finally {
      resendInFlight.current = false
      setResendBusy(false)
    }
  }

  return (
    <AuthShell
      kicker="Access terminal"
      title="Verify your email"
      sub={session.maskedEmail ? `We sent a 6-digit verification code to ${session.maskedEmail}` : "We've sent a 6-digit verification code to your registered email."}
    >
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

        {error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {resendMessage && !error && <p className="text-sm text-emerald-300">{resendMessage}</p>}

        <p className="text-center font-mono text-xs text-slate-500">
          {expiresIn > 0 ? <>OTP expires in {mmss}</> : <span className="text-rose-300">OTP has expired — request a new one below.</span>}
        </p>

        <MagneticButton onClick={verify} variant="solid" disabled={busy || otpCode.length !== 6 || expiresIn <= 0} className="w-full justify-center">
          {busy ? 'Verifying…' : 'Verify OTP'}
        </MagneticButton>

        <div className="text-center text-sm text-slate-400">
          {cooldown > 0 ? (
            <span>Resend OTP in {cooldown}s</span>
          ) : (
            <button type="button" onClick={resend} disabled={resendBusy} className="text-cyan-300 hover:underline disabled:opacity-50">
              {resendBusy ? 'Sending…' : 'Resend OTP'}
            </button>
          )}
        </div>

        <button type="button" onClick={() => clearAndGo(session.flow === 'admin' ? '/admin/login' : '/login')} className="text-center text-xs text-slate-500 hover:text-slate-300">
          ← Back to login
        </button>
      </div>
    </AuthShell>
  )
}
