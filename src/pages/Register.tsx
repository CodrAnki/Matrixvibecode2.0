import type * as React from 'react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import MagneticButton from '../components/MagneticButton'
import { useAuth } from '../context/AuthContext'
import { isEmail, isPhone } from '../lib/validate'
import { TEAM_YEARS } from '../lib/types'
import { ORIGINAL_LOGO_SRC } from '../components/Logo'

// Team size includes the leader, so only one additional member may be registered.
const MAX_REGISTRATION_MEMBERS = 1

type MemberInput = { name: string; email: string }
type Errors = Record<string, string>

export default function Register() {
  const { team, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ teamName: '', leaderName: '', email: '', phone: '', college: '', teamYear: '', password: '' })
  const [members, setMembers] = useState<MemberInput[]>([])
  const [errs, setErrs] = useState<Errors>({})
  const [top, setTop] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // sync guard against double submit (would fire two register requests)
  if (team) return <Navigate to="/dashboard" replace />
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    const er: Errors = {}
    if (f.teamName.trim().length < 3) er.teamName = 'At least 3 characters.'
    if (f.leaderName.trim().length < 2) er.leaderName = 'Enter the leader’s name.'
    if (!isEmail(f.email)) er.email = 'Enter a valid email.'
    if (!isPhone(f.phone)) er.phone = 'Enter a valid phone number.'
    if (f.college.trim().length < 3) er.college = 'Enter your college name.'
    if (f.teamYear && !(TEAM_YEARS as readonly string[]).includes(f.teamYear)) er.teamYear = 'Invalid team year.'
    if (f.password.length < 8) er.password = 'Minimum 8 characters.'
    members.forEach((m, i) => { if (m.name.trim().length < 2) er[`m${i}`] = 'Enter member name.' })
    setErrs(er)
    if (Object.keys(er).length) return
    inFlight.current = true; setBusy(true); setTop('')
    try {
      await register({ ...f, teamYear: f.teamYear || null, members })
      nav('/dashboard', { replace: true })
    }
    catch (x) { setTop(x instanceof Error ? x.message : 'Registration failed.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  return (
    <AuthShell kicker="Team registration" title="Join the Matrix" sub="Create your team leader account. You can add one more member now or later." logoImageSrc={ORIGINAL_LOGO_SRC} compact>
      <form onSubmit={submit} className="auth-register-form grid grid-cols-2 gap-x-3 gap-y-3" noValidate>
        <Field wrapperClassName="min-w-0" label="Team name" value={f.teamName} onChange={set('teamName')} error={errs.teamName} placeholder="Team Neo" />
        <Field wrapperClassName="min-w-0" label="Leader name" value={f.leaderName} onChange={set('leaderName')} error={errs.leaderName} autoComplete="name" />
        <Field wrapperClassName="min-w-0" label="Email" type="email" value={f.email} onChange={set('email')} error={errs.email} autoComplete="email" />
        <Field wrapperClassName="min-w-0" label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={errs.phone} autoComplete="tel" placeholder="+91 98765 43210" />
        <Field wrapperClassName="min-w-0" label="College" value={f.college} onChange={set('college')} error={errs.college} />
        <div>
          <label htmlFor="f-team-year" className="mb-2 block font-mono text-[0.66rem] uppercase tracking-[0.22em] text-red-200/80">Team Year (Optional)</label>
          <select id="f-team-year" className={`field ${errs.teamYear ? 'invalid' : ''}`} value={f.teamYear} onChange={set('teamYear')}>
            <option value="">Select Team Year</option>
            {TEAM_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {errs.teamYear && <p role="alert" className="mt-1.5 text-xs text-rose-300">{errs.teamYear}</p>}
        </div>
        <Field wrapperClassName="col-span-2 min-w-0" label="Password" type="password" value={f.password} onChange={set('password')} error={errs.password} autoComplete="new-password" hint="Minimum 8 characters." />
        <div className="col-span-2 min-w-0">
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-red-200/80">Team members ({members.length}/{MAX_REGISTRATION_MEMBERS})</p>
          <div className="grid gap-3">
            {members.map((m, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <input className={`field ${errs[`m${i}`] ? 'invalid' : ''}`} placeholder="Member name" aria-label={`Member ${i + 1} name`} value={m.name} onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <input className="field" placeholder="Email (optional)" aria-label={`Member ${i + 1} email`} value={m.email} onChange={(e) => setMembers(members.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} />
                </div>
                <button type="button" aria-label="Remove member" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="rounded-lg border border-rose-400/30 px-3 text-rose-300 hover:bg-rose-500/10">×</button>
              </div>
            ))}
          </div>
          {members.length < MAX_REGISTRATION_MEMBERS && <button type="button" onClick={() => setMembers([...members, { name: '', email: '' }])} className="mt-3 font-mono text-[0.68rem] uppercase tracking-widest text-red-300 hover:text-red-100">+ Add member</button>}
        </div>
        {top && <p role="alert" className="col-span-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{top}</p>}
        <MagneticButton type="submit" variant="solid" disabled={busy} fullWidth className="col-span-2 w-full">{busy ? 'Creating team…' : 'Create team'}</MagneticButton>
        <p className="col-span-2 text-center text-sm text-slate-400">Already registered? <Link to="/login" className="text-red-300 hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  )
}
