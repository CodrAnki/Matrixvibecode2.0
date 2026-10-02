import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import MagneticButton from '../components/MagneticButton'
import { useAuth } from '../context/AuthContext'
import { isEmail } from '../lib/validate'

export default function Login() {
  const { team, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/dashboard'
  const justReset = (loc.state as { passwordReset?: boolean } | null)?.passwordReset === true
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // sync guard: `busy` state lags a render, so a double submit could send two OTP emails
  if (team) return <Navigate to="/dashboard" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    if (!isEmail(email)) return setErr('Enter a valid email address.')
    if (!password) return setErr('Enter your password.')
    inFlight.current = true; setBusy(true); setErr('')
    try {
      const res = await login(email, password)
      nav('/verify-otp', { state: { verificationId: res.verificationId, maskedEmail: res.maskedEmail, expiresInSeconds: res.expiresInSeconds, flow: 'team', from } })
    } catch (x) { setErr(x instanceof Error ? x.message : 'Login failed.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  return (
    <AuthShell kicker="Access terminal" title="Team login" sub="Sign in with your team leader account to enter the mission control dashboard.">
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Field label="Email" type="email" autoComplete="email" placeholder="leader@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="relative">
          <Field label="Password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute bottom-3 right-3 font-mono text-[0.6rem] uppercase tracking-widest text-cyan-300/80 hover:text-cyan-100">{show ? 'Hide' : 'Show'}</button>
        </div>
        <div className="-mt-2 text-right"><Link to="/forgot-password" className="text-xs text-cyan-300 hover:underline">Forgot password?</Link></div>
        {justReset && !err && <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">Password changed. Sign in with your new password.</p>}
        {err && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}
        <MagneticButton type="submit" variant="solid" disabled={busy} className="w-full">{busy ? 'Authenticating…' : 'Sign in'}</MagneticButton>
        <p className="text-center text-sm text-slate-400">New team? <Link to="/register" className="text-cyan-300 hover:underline">Register now</Link></p>
      </form>
    </AuthShell>
  )
}
