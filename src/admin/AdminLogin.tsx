import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import { ORIGINAL_LOGO_SRC } from '../components/Logo'
import MagneticButton from '../components/MagneticButton'
import { useAdminAuth } from './AdminAuthContext'
import { ApiError } from '../lib/api'

export default function AdminLogin() {
  const { admin, loading, login } = useAdminAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // sync guard against double submit (would fire two login requests)

  if (!loading && admin) return <Navigate to="/admin" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    inFlight.current = true
    setErr(''); setBusy(true)
    try {
      await login(email, password)
      nav('/admin', { replace: true })
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Login failed.') }
    finally { inFlight.current = false; setBusy(false) }
  }

  return (
    <AuthShell kicker="Organizer access" title="Admin panel" sub="Sign in to manage the MATRIX Vibe Coding event." logoImageSrc={ORIGINAL_LOGO_SRC}>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-red-200/70">Email</label>
            <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw" className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-red-200/70">Password</label>
            <input id="pw" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
          <MagneticButton type="submit" variant="solid" className="w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</MagneticButton>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">Not an organizer? <Link to="/login" className="text-red-300 hover:text-red-100">Team login →</Link></p>
    </AuthShell>
  )
}
