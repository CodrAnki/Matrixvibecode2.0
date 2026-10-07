import { useEffect, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import * as teamApi from '../api/teamApi'
import { ApiError } from '../lib/api'
import { isEmail, isPhone } from '../lib/validate'
import { useFlash } from '../hooks/useFlash'

const EMPTY = { name: '', email: '', phone: '', college: '', branch: '', year: '' }
type Form = typeof EMPTY

export default function MyTeam() {
  const { team, user, refresh } = useAuth()
  const [form, setForm] = useState<Form>(EMPTY)
  const [open, setOpen] = useState(false)
  const [maxSize, setMaxSize] = useState(2)
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({})
  const [msg, flash] = useFlash(3000)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // Event-wide max team size (including the leader) comes from the server's existing setting.
  useEffect(() => { teamApi.getMyTeamInfo().then((r) => setMaxSize(r.maxTeamSize)).catch(() => {}) }, [])

  if (!team) return null

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const addMember = async (e: FormEvent) => {
    e.preventDefault()
    const er: Partial<Record<keyof Form, string>> = {}
    const email = form.email.trim().toLowerCase()
    if (form.name.trim().length < 2) er.name = 'Enter the member’s name.'
    if (!isEmail(email)) er.email = 'Enter a valid email.'
    else if (email === user?.email.toLowerCase()) er.email = 'This is the team leader’s email.'
    else if ((team.members ?? []).some((m) => m.email?.toLowerCase() === email)) er.email = 'Already in your team.'
    if (form.phone.trim() && !isPhone(form.phone)) er.phone = 'Enter a valid phone number.'
    setErrs(er)
    if (Object.keys(er).length) return
    setErr(''); setBusy(true)
    try {
      await teamApi.addMember(team.teamId, {
        name: form.name.trim(), email,
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.college.trim() && { college: form.college.trim() }),
        ...(form.branch.trim() && { branch: form.branch.trim() }),
        ...(form.year.trim() && { year: form.year.trim() }),
      })
      await refresh() // re-fetch the team from the server so the list reflects what was actually saved
      setForm(EMPTY); setOpen(false)
      flash('Member added.')
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not add member.') }
    finally { setBusy(false) }
  }

  const removeMember = async (memberId: string) => {
    setBusy(true); setErr('')
    try { await teamApi.removeMember(team.teamId, memberId); await refresh(); flash('Member removed.') }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not remove member.') }
    finally { setBusy(false) }
  }

  const members = team.members ?? []
  const total = members.length + 1
  const atCapacity = total >= maxSize
  const locked = team.verificationStatus === 'VERIFIED'
  const canAdd = !locked && !atCapacity

  const fieldRow = (k: keyof Form, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <input className={`field ${errs[k] ? 'invalid' : ''}`} placeholder={label} aria-label={label} value={form[k]} onChange={set(k)} {...props} />
      {errs[k] && <p role="alert" className="mt-1 text-xs text-rose-300">{errs[k]}</p>}
    </div>
  )

  return (
    <>
      <PageHeader kicker="Squad" title="My Team" sub={`${team.teamName} · ${team.college ?? '—'}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="glass hud-corners relative p-6">
          <p className="hud-label mb-4">Team leader</p>
          <p className="text-2xl font-bold text-white">{user?.name}</p>
          <dl className="mt-5 grid gap-3 text-sm">
            {[['Email', user?.email], ['Phone', team.phone], ['College', team.college], ...(team.teamYear ? [['Team Year', team.teamYear]] : []), ['Team ID', team.teamId], ['Status', team.verificationStatus]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-cyan-400/10 pb-2"><dt className="text-slate-400">{k}</dt><dd className="break-all text-right text-white">{v}</dd></div>
            ))}
          </dl>
        </section>

        <section className="glass p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="hud-label">Members ({total}/{maxSize})</p>
            <button
              type="button" disabled={!canAdd} onClick={() => { setOpen((o) => !o); setErr('') }} aria-expanded={open}
              className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-cyan-100 transition-colors hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >{open ? '× Close' : '+ Add Member'}</button>
          </div>

          {open && canAdd && (
            <form onSubmit={addMember} noValidate className="mb-5 grid gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.03] p-4">
              <p className="font-mono text-[0.65rem] uppercase tracking-widest text-cyan-300/80">New member</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {fieldRow('name', 'Full name *', { autoComplete: 'off' })}
                {fieldRow('email', 'Email *', { type: 'email', autoComplete: 'off' })}
                {fieldRow('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'off' })}
                {fieldRow('college', `College (default: ${team.college ?? 'team college'})`)}
                {fieldRow('branch', 'Branch / course (optional)')}
                {fieldRow('year', `Year (optional${team.teamYear ? `, default: ${team.teamYear}` : ''})`)}
              </div>
              {err && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/25 disabled:opacity-40">{busy ? 'Adding…' : 'Add to team'}</button>
                <button type="button" onClick={() => { setOpen(false); setForm(EMPTY); setErrs({}); setErr('') }} className="rounded-lg border border-white/15 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-slate-300 hover:bg-white/5">Cancel</button>
              </div>
            </form>
          )}

          <ul className="grid gap-3">
            <li className="flex items-center justify-between gap-3 rounded-lg border border-cyan-400/10 bg-white/[0.02] p-3">
              <div className="min-w-0"><p className="truncate text-white">{user?.name}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>
              <span className="shrink-0 rounded border border-emerald-400/30 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-emerald-300">Leader</span>
            </li>
            {members.length === 0 && <li className="text-sm text-slate-400">No additional members yet.</li>}
            {members.map((m) => (
              <li key={m.memberId} className="flex items-center justify-between gap-3 rounded-lg border border-cyan-400/10 bg-white/[0.02] p-3">
                <div className="min-w-0">
                  <p className="truncate text-white">{m.name}</p>
                  <p className="truncate text-xs text-slate-400">{[m.email, m.phone].filter(Boolean).join(' · ')}</p>
                  {(m.college || m.branch || m.year) && <p className="truncate text-xs text-slate-500">{[m.college, m.branch, m.year].filter(Boolean).join(' · ')}</p>}
                </div>
                <button disabled={busy || locked} aria-label={`Remove ${m.name}`} onClick={() => removeMember(m.memberId)} className="shrink-0 rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">×</button>
              </li>
            ))}
          </ul>

          {locked && <p className="mt-4 text-xs text-amber-300/80">Your team is verified — roster changes must go through an admin now.</p>}
          {atCapacity && !locked && <p className="mt-4 text-xs text-slate-400">Maximum team size reached ({maxSize}, including the leader).</p>}
          {!open && err && <p role="alert" className="mt-4 text-sm text-rose-300">{err}</p>}
          {msg && <p role="status" className="mt-4 text-sm text-emerald-300">{msg}</p>}
        </section>
      </div>
    </>
  )
}
