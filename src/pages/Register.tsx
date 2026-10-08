import type * as React from 'react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from '../components/AuthShell'
import Field from '../components/Field'
import Select from '../components/Select'
import MagneticButton from '../components/MagneticButton'
import { useAuth } from '../context/AuthContext'
import { isEmail, isPhone } from '../lib/validate'
import { TEAM_YEARS } from '../lib/types'
import { refreshEventState, useRegistrationOpen } from '../lib/eventPhase'

// Solo or duo: the leader, plus at most one teammate. The server enforces the same limit.
const MAX_REGISTRATION_MEMBERS = 1

type MemberInput = { name: string; email: string; phone: string }
const EMPTY_MEMBER: MemberInput = { name: '', email: '', phone: '' }
type Errors = Record<string, string>

export default function Register() {
  const { team, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ teamName: '', leaderName: '', email: '', phone: '', teamYear: '', password: '' })
  const [members, setMembers] = useState<MemberInput[]>([])
  const [errs, setErrs] = useState<Errors>({})
  const [top, setTop] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false) // sync guard against double submit (would fire two register requests)
  const registrationOpen = useRegistrationOpen()
  if (team) return <Navigate to="/dashboard" replace />
  if (!registrationOpen) {
    return (
      <AuthShell kicker="Team registration" title={<>Registrations are <span className="hl-red">closed.</span></>} sub="Vibe Coding 2.0 is underway, so new teams can no longer sign up. Registered teams can sign in as usual.">
        <div className="grid gap-3">
          <MagneticButton to="/login" variant="solid" className="w-full">Team login →</MagneticButton>
          <MagneticButton to="/problems" className="w-full">Problem statements</MagneticButton>
          <p className="mt-2 text-center text-sm text-slate-400">Questions? <Link to="/support" className="text-red-300 hover:underline">Contact support</Link></p>
        </div>
      </AuthShell>
    )
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (inFlight.current) return
    const er: Errors = {}
    if (f.teamName.trim().length < 3) er.teamName = 'At least 3 characters.'
    if (f.leaderName.trim().length < 2) er.leaderName = 'Enter the leader’s name.'
    if (!isEmail(f.email)) er.email = 'Enter a valid email.'
    if (!isPhone(f.phone)) er.phone = 'Enter a valid phone number.'
    if (f.teamYear && !(TEAM_YEARS as readonly string[]).includes(f.teamYear)) er.teamYear = 'Invalid team year.'
    if (f.password.length < 8) er.password = 'Minimum 8 characters.'
    // A teammate is optional, but once you start adding one we need all three details.
    members.forEach((m, i) => {
      if (m.name.trim().length < 2) er[`m${i}-name`] = 'Enter your teammate’s name.'
      if (!isEmail(m.email)) er[`m${i}-email`] = 'Enter a valid email.'
      if (!isPhone(m.phone)) er[`m${i}-phone`] = 'Enter a valid phone number.'
    })
    setErrs(er)
    if (Object.keys(er).length) return
    inFlight.current = true; setBusy(true); setTop('')
    try {
      await register({ ...f, teamYear: f.teamYear || null, members })
      nav('/dashboard', { replace: true })
    }
    catch (x) {
      setTop(x instanceof Error ? x.message : 'Registration failed.')
      // If registration closed while the form was open, re-check so the page switches to its closed state.
      void refreshEventState()
    }
    finally { inFlight.current = false; setBusy(false) }
  }
  return (
    <AuthShell
      kicker="Team registration"
      title={<>Enter the <span className="hl-red">hackathon.</span></>}
      sub="Register your team for Vibe Coding 2.0. Teams are solo or duo — add your teammate now, or later from your dashboard."
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Team name" value={f.teamName} onChange={set('teamName')} error={errs.teamName} placeholder="Null Pointers" />
        <Field label="Leader name" value={f.leaderName} onChange={set('leaderName')} error={errs.leaderName} autoComplete="name" placeholder="Aditi Sharma" />
        <Field label="Email" type="email" value={f.email} onChange={set('email')} error={errs.email} autoComplete="email" placeholder="you@example.com" />
        <Field label="Phone" type="tel" value={f.phone} onChange={set('phone')} error={errs.phone} autoComplete="tel" placeholder="+91 98765 43210" />
        <div>
          <label htmlFor="f-team-year" className="mb-2 block font-mono text-[0.66rem] uppercase tracking-[0.22em] text-red-200/80">Team year (optional)</label>
          <Select
            id="f-team-year"
            invalid={Boolean(errs.teamYear)}
            value={f.teamYear}
            onChange={(v) => setF({ ...f, teamYear: v })}
            options={[{ value: '', label: 'Not a first-year team' }, ...TEAM_YEARS.map((y) => ({ value: y, label: y }))]}
          />
          <p className="mt-1.5 text-xs text-slate-500">Pick “1st Year” only if everyone on the team is a first-year — that’s what makes you eligible for the First Year special prize.</p>
          {errs.teamYear && <p role="alert" className="mt-1.5 text-xs text-rose-300">{errs.teamYear}</p>}
        </div>
        <Field label="Password" type="password" value={f.password} onChange={set('password')} error={errs.password} autoComplete="new-password" placeholder="••••••••" hint="Minimum 8 characters." />
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-red-200/80">Teammate ({members.length}/{MAX_REGISTRATION_MEMBERS}) — optional</p>
          <div className="grid gap-3">
            {members.map((m, i) => {
              const edit = (patch: Partial<MemberInput>) => setMembers(members.map((x, j) => (j === i ? { ...x, ...patch } : x)))
              return (
                <div key={i} className="rounded-lg border border-white/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-slate-400">Teammate details</span>
                    <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="font-mono text-[0.6rem] uppercase tracking-widest text-rose-300 hover:text-rose-100">Remove</button>
                  </div>
                  <div className="grid gap-3">
                    <Field id={`m${i}-name`} label="Name" value={m.name} onChange={(e) => edit({ name: e.target.value })} error={errs[`m${i}-name`]} placeholder="Rohan Verma" />
                    <Field id={`m${i}-email`} label="Email" type="email" value={m.email} onChange={(e) => edit({ email: e.target.value })} error={errs[`m${i}-email`]} placeholder="teammate@example.com" />
                    <Field id={`m${i}-phone`} label="Phone" type="tel" value={m.phone} onChange={(e) => edit({ phone: e.target.value })} error={errs[`m${i}-phone`]} placeholder="+91 98765 43210" />
                  </div>
                </div>
              )
            })}
          </div>
          {members.length < MAX_REGISTRATION_MEMBERS && <button type="button" onClick={() => setMembers([...members, EMPTY_MEMBER])} className="mt-3 font-mono text-[0.68rem] uppercase tracking-widest text-red-300 hover:text-red-100">+ Add teammate</button>}
        </div>
        {top && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{top}</p>}
        <MagneticButton type="submit" variant="solid" disabled={busy} className="w-full">{busy ? 'Creating team…' : 'Create team'}</MagneticButton>
        <p className="text-center text-sm text-slate-400">Already registered? <Link to="/login" className="text-red-300 hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  )
}
