import { useEffect, useState, type FormEvent } from 'react'
import { useFlash } from '../../hooks/useFlash'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import * as adminApi from '../../api/adminApi'
import type { Team } from '../../lib/types'
import { ApiError } from '../../lib/api'

const EMPTY_MEMBER = { name: '', email: '', phone: '' }
const MAX_TEAM_SIZE = 2

function PersonCard({ name, email, phone, college, branch, year, leader, index }: {
  name?: string; email?: string; phone?: string; college?: string; branch?: string; year?: string; leader?: boolean; index?: number
}) {
  const rows: [string, string | undefined][] = [['Email', email], ['Phone', phone], ['College', college], ['Branch / course', branch], ['Year', year]]
  return (
    <div className={`rounded-xl border p-4 ${leader ? 'border-red-400/30 bg-red-400/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-base font-semibold text-white">{name ?? '—'}</p>
        <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest ${leader ? 'border-red-400/40 text-red-300' : 'border-red-400/30 text-red-300'}`}>{leader ? 'Team Leader' : `Member ${index}`}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="shrink-0 text-slate-400">{k}</dt><dd className="break-all text-right text-white">{v || '—'}</dd></div>
        ))}
      </dl>
    </div>
  )
}

export default function AdminTeamDetail() {
  const { teamId = '' } = useParams()
  const [detail, setDetail] = useState<{ team: Team & { leader?: { name: string; email: string; phone?: string } }; checkIn: unknown } | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [msg, flash] = useFlash(3000)
  const [busy, setBusy] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [memberFormOpen, setMemberFormOpen] = useState(false)
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER)

  const load = () => adminApi.getTeamDetail(teamId).then(setDetail).catch(() => setErr('Could not load team.'))
  useEffect(() => { load() }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true); setErr('')
    try { await fn(); flash(successMsg); load() }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Action failed.') }
    finally { setBusy(false) }
  }

  const regenQr = async () => {
    setBusy(true); setErr('')
    try {
      const res = await adminApi.regenerateQr(teamId)
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, res.qr.url, { width: 240 })
      setQrUrl(canvas.toDataURL('image/png'))
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not regenerate QR.') }
    finally { setBusy(false) }
  }

  const addMember = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await adminApi.addTeamMember(teamId, {
        name: memberForm.name.trim(),
        email: memberForm.email.trim().toLowerCase(),
        ...(memberForm.phone.trim() && { phone: memberForm.phone.trim() }),
      })
      setMemberForm(EMPTY_MEMBER)
      setMemberFormOpen(false)
      flash('Member added to team.')
      await load()
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Could not add member.')
    } finally {
      setBusy(false)
    }
  }

  if (err && !detail) return <p role="alert" className="text-sm text-rose-300">{err}</p>
  if (!detail) return <p className="text-sm text-slate-400">Loading…</p>
  const { team } = detail
  const members = team.members ?? []
  const canAddMember = !team.isDeleted
    && !team.disabled
    && team.verificationStatus !== 'VERIFIED'
    && members.length + 1 < MAX_TEAM_SIZE
  const ps = team.problemStatement
  const teamInfo: [string, string | null | undefined][] = [
    ['Team name', team.teamName],
    ['Team ID', team.teamId],
    ['College', team.college],
    ['Team contact', team.phone],
    ['Team Year', team.teamYear ?? 'Not specified'],
    ['Registration', team.registrationStatus === 'PENDING' ? 'Incomplete (OTP pending)' : 'Completed'],
    ['Verification', team.verificationStatus],
    ['Event stage', team.eventStatus],
    ['Problem statement', ps && typeof ps === 'object' ? ps.title : ps ? String(ps) : 'Not selected'],
    ['Check-in', team.checkedIn ? `Checked in${team.checkedInAt ? ` · ${new Date(team.checkedInAt).toLocaleString()}` : ''}` : 'Not checked in'],
    ['Account', team.disabled ? 'Disabled' : 'Active'],
    ['Registered on', team.createdAt ? new Date(team.createdAt).toLocaleString() : null],
  ]

  return (
    <>
      <Link to="/admin/teams" className="mb-4 inline-block font-mono text-xs uppercase tracking-widest text-red-300 hover:text-red-100">← All teams</Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="hud-label mb-1">{team.teamId}</p>
          <h1 className="text-3xl font-bold text-white">{team.teamName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => act(() => adminApi.verifyTeam(teamId, note), 'Team verified — QR issued.')} className="rounded-lg border border-red-400/30 px-3 py-2 font-mono text-xs uppercase text-red-300 hover:bg-red-400/10 disabled:opacity-40">Verify</button>
          <button disabled={busy} onClick={() => act(() => adminApi.requestChanges(teamId, note), 'Changes requested.')} className="rounded-lg border border-red-400/30 px-3 py-2 font-mono text-xs uppercase text-red-300 hover:bg-red-400/10 disabled:opacity-40">Request Changes</button>
          <button disabled={busy} onClick={() => act(() => adminApi.rejectTeam(teamId, note), 'Team rejected.')} className="rounded-lg border border-rose-400/30 px-3 py-2 font-mono text-xs uppercase text-rose-300 hover:bg-rose-400/10 disabled:opacity-40">Reject</button>
          <button disabled={busy} onClick={() => act(() => adminApi.disableTeam(teamId), 'Team disabled toggled.')} className="rounded-lg border border-white/15 px-3 py-2 font-mono text-xs uppercase text-slate-300 hover:bg-white/5 disabled:opacity-40">{team.disabled ? 'Enable' : 'Disable'}</button>
        </div>
      </div>
      {msg && <p role="status" className="mb-4 text-sm text-red-300">{msg}</p>}
      {err && <p role="alert" className="mb-4 text-sm text-rose-300">{err}</p>}

      <div className="mb-6">
        <input className="field" placeholder="Optional note for this verification action…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <section className="admin-glass p-6">
            <p className="hud-label mb-4">Team information</p>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {teamInfo.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-2"><dt className="shrink-0 text-slate-400">{k}</dt><dd className="break-words text-right text-white">{v ?? '—'}</dd></div>
              ))}
            </dl>
          </section>
          <section className="admin-glass p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="hud-label">Team members ({members.length + 1}/{MAX_TEAM_SIZE})</p>
              {canAddMember && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setMemberFormOpen((value) => !value); setErr('') }}
                  aria-expanded={memberFormOpen}
                  className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 font-mono text-[0.65rem] uppercase tracking-widest text-red-100 hover:bg-red-400/20 disabled:opacity-40"
                >
                  {memberFormOpen ? 'Cancel' : '+ Add Member'}
                </button>
              )}
            </div>
            {memberFormOpen && canAddMember && (
              <form onSubmit={addMember} className="mb-5 grid gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.03] p-4">
                <p className="font-mono text-[0.62rem] uppercase tracking-widest text-red-300/80">Add team member</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    minLength={2}
                    className="field"
                    placeholder="Full name"
                    aria-label="Member full name"
                    value={memberForm.name}
                    onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  />
                  <input
                    required
                    type="email"
                    className="field"
                    placeholder="Email"
                    aria-label="Member email"
                    value={memberForm.email}
                    onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  />
                  <input
                    type="tel"
                    className="field"
                    placeholder="Phone (optional)"
                    aria-label="Member phone"
                    value={memberForm.phone}
                    onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg border border-red-400/40 bg-red-400/15 px-4 py-2 font-mono text-[0.65rem] uppercase tracking-widest text-red-100 hover:bg-red-400/25 disabled:opacity-40"
                  >
                    {busy ? 'Adding…' : 'Add to team'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => { setMemberFormOpen(false); setMemberForm(EMPTY_MEMBER) }}
                    className="rounded-lg border border-white/15 px-4 py-2 font-mono text-[0.65rem] uppercase tracking-widest text-slate-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            {team.verificationStatus === 'VERIFIED' && (
              <p className="mb-4 text-xs text-amber-300/80">Verified teams cannot change their roster.</p>
            )}
            {!team.isDeleted && !team.disabled && team.verificationStatus !== 'VERIFIED' && !canAddMember && (
              <p className="mb-4 text-xs text-slate-400">Maximum team size reached ({MAX_TEAM_SIZE}, including the leader).</p>
            )}
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-widest text-red-300/80">Team leader</p>
            <PersonCard
              leader name={team.leader?.name} email={team.leader?.email} phone={team.leader?.phone ?? team.phone}
              college={team.college} branch={undefined} year={team.teamYear ?? undefined}
            />
            <p className="mb-2 mt-6 font-mono text-[0.6rem] uppercase tracking-widest text-red-300/80">Other team members ({members.length})</p>
            {members.length === 0 && <p className="text-sm text-slate-500">No additional members.</p>}
            <div className="grid gap-3">
              {members.map((m, i) => (
                <PersonCard key={m.memberId} index={i + 1} name={m.name} email={m.email} phone={m.phone} college={m.college ?? team.college} branch={m.branch} year={m.year} />
              ))}
            </div>
          </section>
          <section className="admin-glass p-6">
            <p className="hud-label mb-4">Verification history</p>
            <ul className="grid gap-2 text-sm">
              {(team.verificationHistory ?? []).map((h, i) => (
                <li key={i} className="flex justify-between border-b border-white/5 pb-2"><span className="text-white">{h.status}{h.note ? ` — ${h.note}` : ''}</span><span className="text-slate-500">{new Date(h.at).toLocaleString()}</span></li>
              ))}
            </ul>
          </section>
        </div>
        <div className="grid gap-6">
          <section className="admin-glass p-6 text-center">
            <p className="hud-label mb-4">QR / check-in</p>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">{team.checkedIn ? '✓ Checked in' : 'Not checked in'}</p>
            {qrUrl ? <div className="mx-auto w-fit rounded-xl border border-white/10 bg-white p-2 text-center"><img src={qrUrl} alt="Regenerated QR" className="mx-auto" />{team.teamYear === '1st Year' && <p className="mt-1 text-base font-bold text-[#050506]">1st Year</p>}</div> : <p className="text-xs text-slate-500">Regenerate to view the current QR image here.</p>}
            <button disabled={busy || team.verificationStatus !== 'VERIFIED'} onClick={regenQr} className="mt-4 w-full rounded-lg border border-red-400/30 px-3 py-2 font-mono text-xs uppercase text-red-200 hover:bg-red-400/10 disabled:opacity-40">Regenerate QR</button>
          </section>
        </div>
      </div>
    </>
  )
}
