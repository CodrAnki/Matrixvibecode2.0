import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
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
    <div className="grid min-h-[100svh] place-items-center bg-void px-4">
      <div className="admin-glass w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#00D9FF]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" strokeLinejoin="round" />
          </svg>
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-cyan-300/70">MATRIX Vibe Coding 2.0</p>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-cyan-200/70">Email</label>
            <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw" className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-cyan-200/70">Password</label>
            <input id="pw" type="password" required className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
          <MagneticButton type="submit" variant="solid" className="w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</MagneticButton>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">Not an organizer? <Link to="/login" className="text-cyan-300 hover:text-cyan-100">Team login →</Link></p>
      </div>
    </div>
  )
}
