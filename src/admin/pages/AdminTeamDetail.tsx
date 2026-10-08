import { useEffect, useState } from 'react'
import { useFlash } from '../../hooks/useFlash'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import * as adminApi from '../../api/adminApi'
import type { Team } from '../../lib/types'
import { ApiError } from '../../lib/api'
import { IconCheck } from '../../components/Icons'
import ConfirmButton from '../../components/ConfirmButton'
import { useAdminAuth } from '../AdminAuthContext'
import { STATUS_BADGE } from '../teamStatus'

const BTN = 'rounded-lg border px-3 py-2 font-mono text-xs uppercase disabled:cursor-not-allowed disabled:opacity-40'

async function qrToDataUrl(url: string) {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, url, { width: 240, margin: 1 })
  return canvas.toDataURL('image/png')
}

function PersonCard({ name, email, phone, year, leader, index }: {
  name?: string; email?: string; phone?: string; year?: string; leader?: boolean; index?: number
}) {
  const rows: [string, string | undefined][] = [['Email', email], ['Phone', phone], ['Year', year]]
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
  const { admin } = useAdminAuth()
  const isSuper = admin?.role === 'SUPER_ADMIN'
  const [detail, setDetail] = useState<{ team: Team & { leader?: { name: string; email: string; phone?: string } }; checkIn: unknown } | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const [msg, flash] = useFlash(3000)
  const [busy, setBusy] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrErr, setQrErr] = useState('')

  const load = () => adminApi.getTeamDetail(teamId).then(setDetail).catch(() => setErr('Could not load team.'))
  useEffect(() => { load() }, [teamId]) // eslint-disable-line react-hooks/exhaustive-deps

  // A verified team's QR is shown straight away (view-only). Previously the only way to see it was
  // "Regenerate", which silently killed the QR the team had already downloaded.
  const verified = detail?.team.verificationStatus === 'VERIFIED'
  useEffect(() => {
    setQrUrl(null); setQrErr('')
    if (!verified) return
    adminApi.getTeamQr(teamId)
      .then((r) => qrToDataUrl(r.qr.url))
      .then(setQrUrl)
      .catch((x) => setQrErr(x instanceof ApiError ? x.message : 'Could not load QR.'))
  }, [teamId, verified])

  const act = async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true); setErr('')
    try { await fn(); flash(successMsg); setNote(''); load() }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Action failed.'); load() }
    finally { setBusy(false) }
  }

  const regenQr = async () => {
    setBusy(true); setErr('')
    try {
      const res = await adminApi.regenerateQr(teamId)
      setQrUrl(await qrToDataUrl(res.qr.url))
      flash('New QR issued — the team’s old QR no longer works.')
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not regenerate QR.') }
    finally { setBusy(false) }
  }

  if (err && !detail) return <p role="alert" className="text-sm text-rose-300">{err}</p>
  if (!detail) return <p className="text-sm text-slate-400">Loading…</p>
  const { team } = detail
  const s = team.verificationStatus
  const badge = STATUS_BADGE[s] ?? STATUS_BADGE.PENDING
  // Which review actions make sense right now. Moving to the status the team is already in is
  // pointless (and the server now rejects it); a checked-in team can't be un-verified.
  const canVerify = s !== 'VERIFIED'
  const canRequestChanges = s !== 'CHANGES_REQUIRED' && !team.checkedIn
  const canReject = s !== 'REJECTED' && !team.checkedIn
  const anyReview = canVerify || canRequestChanges || canReject
  const ps = team.problemStatement
  const teamInfo: [string, string | null | undefined][] = [
    ['Team name', team.teamName],
    ['Team ID', team.teamId],
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="hud-label mb-1">{team.teamId}</p>
          <h1 className="text-3xl font-bold text-white">{team.teamName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest ${badge.cls}`}>{badge.label}</span>
            {team.checkedIn && <span className="rounded-full border border-[#38B878]/50 bg-[#38B878]/10 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-[#A9E7C4]">Checked in</span>}
            {team.disabled && <span className="rounded-full border border-rose-400/40 bg-rose-400/10 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-rose-200">Disabled</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canVerify && (
            <button
              disabled={busy || team.disabled}
              title={team.disabled ? 'Enable the team before verifying it' : undefined}
              onClick={() => act(() => adminApi.verifyTeam(teamId, note), 'Team verified — QR issued.')}
              className={`${BTN} border-[#38B878]/50 text-[#A9E7C4] hover:bg-[#38B878]/10`}
            >Verify</button>
          )}
          {canRequestChanges && (
            <button disabled={busy} onClick={() => act(() => adminApi.requestChanges(teamId, note), 'Changes requested — the team sees your note on their dashboard.')} className={`${BTN} border-orange-400/40 text-orange-200 hover:bg-orange-400/10`}>Request changes</button>
          )}
          {canReject && (
            <ConfirmButton
              disabled={busy}
              message={`Reject ${team.teamName}?`}
              confirmLabel="Yes, reject"
              onConfirm={() => act(() => adminApi.rejectTeam(teamId, note), 'Team rejected.')}
              className={`${BTN} border-rose-400/40 text-rose-300 hover:bg-rose-400/10`}
            >Reject</ConfirmButton>
          )}
          {/* Disable is SUPER_ADMIN-only on the server, so other admins don't see a button that can only fail. */}
          {isSuper && (team.disabled ? (
            <button disabled={busy} onClick={() => act(() => adminApi.disableTeam(teamId), 'Team enabled.')} className={`${BTN} border-white/15 text-slate-300 hover:bg-white/5`}>Enable</button>
          ) : (
            <ConfirmButton
              disabled={busy}
              message="Disable? Its QR stops working."
              confirmLabel="Yes, disable"
              onConfirm={() => act(() => adminApi.disableTeam(teamId), 'Team disabled — it can’t check in or edit its team.')}
              className={`${BTN} border-white/15 text-slate-300 hover:bg-white/5`}
            >Disable</ConfirmButton>
          ))}
        </div>
      </div>
      {msg && <p role="status" className="mb-4 text-sm text-[#A9E7C4]">{msg}</p>}
      {err && <p role="alert" className="mb-4 text-sm text-rose-300">{err}</p>}

      {anyReview && (
        <div className="mb-6">
          <input className="field" placeholder="Note for the team (optional) — shown on their dashboard, e.g. what needs changing" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
      )}
      {team.checkedIn && s === 'VERIFIED' && (
        <p className="mb-6 rounded-lg border border-white/10 px-4 py-3 text-xs text-slate-400">This team has checked in, so it can no longer be rejected or sent back for changes.</p>
      )}

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
            <p className="hud-label mb-4">Team members ({(team.members ?? []).length + 1})</p>
            <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-widest text-red-300/80">Team leader</p>
            <PersonCard
              leader name={team.leader?.name} email={team.leader?.email} phone={team.leader?.phone ?? team.phone}
              year={team.teamYear ?? undefined}
            />
            <p className="mb-2 mt-6 font-mono text-[0.6rem] uppercase tracking-widest text-red-300/80">Other team members ({(team.members ?? []).length})</p>
            {(team.members ?? []).length === 0 && <p className="text-sm text-slate-500">No additional members.</p>}
            <div className="grid gap-3">
              {(team.members ?? []).map((m, i) => (
                <PersonCard key={m.memberId} index={i + 1} name={m.name} email={m.email} phone={m.phone} year={m.year} />
              ))}
            </div>
          </section>
          <section className="admin-glass p-6">
            <p className="hud-label mb-4">Verification history</p>
            <ul className="grid gap-2 text-sm">
              {(team.verificationHistory ?? []).length === 0 && <li className="text-slate-500">No history yet.</li>}
              {[...(team.verificationHistory ?? [])].reverse().map((h, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-white/5 pb-2">
                  <span className="text-white">{STATUS_BADGE[h.status]?.label ?? h.status}{h.note ? <span className="text-slate-400"> — {h.note}</span> : null}</span>
                  <span className="text-slate-500">{new Date(h.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <div className="grid gap-6">
          <section className="admin-glass p-6 text-center">
            <p className="hud-label mb-4">QR / check-in</p>
            <p className="mb-3 flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-widest text-slate-400">{team.checkedIn ? <><IconCheck className="h-3.5 w-3.5" /> Checked in{team.checkedInAt ? ` · ${new Date(team.checkedInAt).toLocaleString()}` : ''}</> : 'Not checked in'}</p>
            {!verified ? (
              <p className="text-xs text-slate-500">A QR code is issued once the team is verified.</p>
            ) : qrErr ? (
              <p role="alert" className="text-xs text-rose-300">{qrErr}</p>
            ) : qrUrl ? (
              <div className="mx-auto w-fit rounded-xl border border-white/10 bg-white p-2 text-center">
                <img src={qrUrl} alt={`Check-in QR for ${team.teamId}`} className="mx-auto" />
                <p className="mt-1 font-mono text-sm font-bold text-[#050506]">{team.teamId}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Loading QR…</p>
            )}
            {verified && team.disabled && <p className="mt-3 text-xs text-rose-300">Disabled — this QR is rejected at the check-in desk.</p>}
            {/* Reissue is SUPER_ADMIN-only on the server. It invalidates the team's existing QR, so it's confirmed first. */}
            {verified && isSuper && (
              <div className="mt-4">
                <ConfirmButton
                  disabled={busy}
                  message="Old QR stops working."
                  confirmLabel="Reissue"
                  onConfirm={regenQr}
                  className="w-full rounded-lg border border-red-400/30 px-3 py-2 font-mono text-xs uppercase text-red-200 hover:bg-red-400/10 disabled:opacity-40"
                >Reissue QR</ConfirmButton>
                <p className="mt-2 text-[0.68rem] text-slate-500">Only if the team’s QR was leaked or lost.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
