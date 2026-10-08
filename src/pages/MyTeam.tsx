import { useEffect, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react'
import PageHeader from '../components/PageHeader'
import Field from '../components/Field'
import Select from '../components/Select'
import { useAuth } from '../context/AuthContext'
import * as teamApi from '../api/teamApi'
import { ApiError } from '../lib/api'
import { isEmail, isPhone } from '../lib/validate'
import { useFlash } from '../hooks/useFlash'
import TeamStatusBanner, { TEAM_STATUS_LABEL } from '../components/TeamStatusBanner'

const EMPTY = { name: '', email: '', phone: '', year: '' }
type Form = typeof EMPTY
const YEAR_OPTIONS = [
  { value: '', label: 'Select…', disabled: true },
  { value: '1st Year', label: '1st Year' },
  { value: 'Not 1st Year', label: 'Not 1st Year' },
]

export default function MyTeam() {
  const { team, user, refresh } = useAuth()
  const [form, setForm] = useState<Form>(EMPTY)
  const [open, setOpen] = useState(false)
  const [maxSize, setMaxSize] = useState(2)
  const [errs, setErrs] = useState<Partial<Record<keyof Form, string>>>({})
  const [msg, flash] = useFlash(3000)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  // Max team size (leader included) is fixed server-side at solo/duo; read it rather than hardcode.
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
    // Required, same as the teammate fields at registration — the two forms used to disagree.
    if (!isPhone(form.phone)) er.phone = 'Enter a valid phone number.'
    // Not optional: this decides whether the team keeps its First Year prize eligibility.
    if (form.year !== '1st Year' && form.year !== 'Not 1st Year') er.year = 'Select whether this teammate is in their first year.'
    setErrs(er)
    if (Object.keys(er).length) return
    const losingFirstYear = team.teamYear === '1st Year' && form.year === 'Not 1st Year'
    setErr(''); setBusy(true)
    try {
      await teamApi.addMember(team.teamId, {
        name: form.name.trim(), email, phone: form.phone.trim(), year: form.year,
      })
      await refresh() // re-fetch the team from the server so the list reflects what was actually saved
      setForm(EMPTY); setOpen(false)
      const review = willResetVerification ? 'pending re-approval' : resubmits ? 'changes submitted for review' : ''
      flash(
        review && losingFirstYear ? `Member added — ${review}, and no longer eligible for the First Year prize.`
        : losingFirstYear ? 'Member added — your team is no longer eligible for the First Year prize.'
        : review ? `Member added — ${review}.`
        : 'Member added.',
      )
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not add member.') }
    finally { setBusy(false) }
  }

  const removeMember = async (memberId: string) => {
    setBusy(true); setErr('')
    try { await teamApi.removeMember(team.teamId, memberId); await refresh(); flash(resubmits ? 'Member removed — changes submitted for review.' : 'Member removed.') }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not remove member.') }
    finally { setBusy(false) }
  }

  const members = team.members ?? []
  const total = members.length + 1
  const atCapacity = total >= maxSize
  // Adding a teammate is allowed even once verified — it just sends the team back to PENDING for an
  // admin to re-approve the new roster (see addMember below). Only checking in at the venue locks it
  // out entirely. Removing a member is a narrower change the server still has go through an admin
  // once verified, so it keeps the old, stricter lock.
  const checkInLocked = team.checkedIn || team.disabled
  const willResetVerification = team.verificationStatus === 'VERIFIED'
  // A team sent back for changes resubmits by editing — the server moves it back to PENDING.
  const resubmits = team.verificationStatus === 'CHANGES_REQUIRED'
  const removeLocked = willResetVerification || checkInLocked
  const canAdd = !checkInLocked && !atCapacity

  // Same Field component and the same placeholders as the registration form, so the two
  // "add a teammate" experiences read identically.
  const fieldRow = (k: keyof Form, label: string, placeholder: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field id={`mt-${k}`} label={label} placeholder={placeholder} value={form[k]} onChange={set(k)} error={errs[k]} {...props} />
  )

  return (
    <>
      <PageHeader kicker="Your team" title="My Team" sub={`${team.teamName} · ${total === 1 ? 'Solo' : 'Duo'}`} />
      {/* Teams sent back for changes are pointed here, so this is where they need to see the admin's note. */}
      {(resubmits || team.disabled) && <TeamStatusBanner team={team} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="glass hud-corners relative p-6">
          <p className="hud-label mb-4">Team leader</p>
          <p className="text-2xl font-bold text-white">{user?.name}</p>
          <dl className="mt-5 grid gap-3 text-sm">
            {[['Email', user?.email], ['Phone', team.phone], ...(team.teamYear ? [['Team Year', team.teamYear]] : []), ['Team ID', team.teamId], ['Status', team.disabled ? 'Disabled' : (TEAM_STATUS_LABEL[team.verificationStatus] ?? team.verificationStatus)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-red-400/10 pb-2"><dt className="text-slate-400">{k}</dt><dd className="break-all text-right text-white">{v}</dd></div>
            ))}
          </dl>
        </section>

        <section className="glass p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* "Team size", not "Members" — the count includes the leader, so a solo team with no
                teammates added yet correctly reads 1/2, not 0/2. */}
            <p className="hud-label">Team size ({total}/{maxSize}, incl. you)</p>
            <button
              type="button" disabled={!canAdd} onClick={() => { setOpen((o) => !o); setErr('') }} aria-expanded={open}
              className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-red-100 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >{open ? '× Close' : '+ Add Member'}</button>
          </div>

          {open && canAdd && (
            <form onSubmit={addMember} noValidate className="mb-5 grid gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.03] p-4">
              <p className="font-mono text-[0.65rem] uppercase tracking-widest text-red-300/80">New member</p>
              {willResetVerification && (
                <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Your team is already verified. Adding someone now will send it back to <strong>pending</strong> until an admin reviews the new roster.
                </p>
              )}
              {team.teamYear === '1st Year' && form.year === 'Not 1st Year' && (
                <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  Your team is flagged <strong>1st Year</strong>. Adding someone who isn't will remove your team's eligibility for the First Year special prize.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {fieldRow('name', 'Name', 'Rohan Verma', { autoComplete: 'off' })}
                {fieldRow('email', 'Email', 'teammate@example.com', { type: 'email', autoComplete: 'off' })}
                {fieldRow('phone', 'Phone', '+91 98765 43210', { type: 'tel', autoComplete: 'off' })}
                <div>
                  <label htmlFor="mt-year" className="mb-2 block font-mono text-[0.66rem] uppercase tracking-[0.22em] text-red-200/80">Year</label>
                  <Select id="mt-year" invalid={Boolean(errs.year)} value={form.year} onChange={(v) => setForm({ ...form, year: v })} options={YEAR_OPTIONS} />
                  {errs.year && <p role="alert" className="mt-1.5 text-xs text-rose-300">{errs.year}</p>}
                </div>
              </div>
              {err && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg border border-red-400/40 bg-red-400/15 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-red-100 hover:bg-red-400/25 disabled:opacity-40">{busy ? 'Adding…' : 'Add to team'}</button>
                <button type="button" onClick={() => { setOpen(false); setForm(EMPTY); setErrs({}); setErr('') }} className="rounded-lg border border-white/15 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-widest text-slate-300 hover:bg-white/5">Cancel</button>
              </div>
            </form>
          )}

          <ul className="grid gap-3">
            <li className="flex items-center justify-between gap-3 rounded-lg border border-red-400/10 bg-white/[0.02] p-3">
              <div className="min-w-0"><p className="truncate text-white">{user?.name}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div>
              <span className="shrink-0 rounded border border-red-400/30 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-red-300">Leader</span>
            </li>
            {members.length === 0 && <li className="text-sm text-slate-400">No additional members yet.</li>}
            {members.map((m) => (
              <li key={m.memberId} className="flex items-center justify-between gap-3 rounded-lg border border-red-400/10 bg-white/[0.02] p-3">
                <div className="min-w-0">
                  <p className="truncate text-white">{m.name}</p>
                  <p className="truncate text-xs text-slate-400">{[m.email, m.phone].filter(Boolean).join(' · ')}</p>
                  {m.year && <p className="truncate text-xs text-slate-500">{m.year}</p>}
                </div>
                <button disabled={busy || removeLocked} aria-label={`Remove ${m.name}`} onClick={() => removeMember(m.memberId)} className="shrink-0 rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">×</button>
              </li>
            ))}
          </ul>

          {team.checkedIn && <p className="mt-4 text-xs text-amber-300/80">Your team has checked in — roster changes must go through an admin now.</p>}
          {atCapacity && !checkInLocked && <p className="mt-4 text-xs text-slate-400">Maximum team size reached ({maxSize}, including the leader).</p>}
          {removeLocked && !checkInLocked && <p className="mt-4 text-xs text-slate-500">Your team is verified, so removing a member needs to go through an admin — adding one is still fine, and will send the team back for re-approval.</p>}
          {!open && err && <p role="alert" className="mt-4 text-sm text-rose-300">{err}</p>}
          {msg && <p role="status" className="mt-4 text-sm text-red-300">{msg}</p>}
        </section>
      </div>
    </>
  )
}
