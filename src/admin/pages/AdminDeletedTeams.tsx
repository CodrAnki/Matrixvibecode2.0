import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as adminApi from '../../api/adminApi'
import type { Team } from '../../lib/types'
import { ApiError } from '../../lib/api'
import MagneticButton from '../../components/MagneticButton'
import { useAdminAuth } from '../AdminAuthContext'
import Pager from '../Pager'
import { useFlash } from '../../hooks/useFlash'

export default function AdminDeletedTeams() {
  const { admin } = useAdminAuth()
  const isSuper = admin?.role === 'SUPER_ADMIN' // permanent delete is SUPER_ADMIN-only on the server too
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [err, setErr] = useState('')
  const [toast, flash] = useFlash()
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Team | null>(null)
  const [permanentTarget, setPermanentTarget] = useState<Team | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const load = useCallback(() => adminApi.listDeletedTeams(page)
    .then((r) => {
      if ((r.teams ?? []).length === 0 && page > 1) { setPage(page - 1); return }
      setTeams(r.teams ?? []); setTotal(r.total ?? 0); setPages(Math.max(1, r.pages ?? 1)); setErr('')
    })
    .catch((x) => { setTeams((t) => t ?? []); setErr(x instanceof ApiError ? x.message : 'Could not load deleted teams.') }), [page])
  useEffect(() => { void load() }, [load])

  const doRestore = async () => {
    if (!restoreTarget) return
    setBusyId(restoreTarget.teamId); setErr('')
    try { await adminApi.restoreTeam(restoreTarget.teamId); flash(`"${restoreTarget.teamName}" restored to active teams.`); setRestoreTarget(null); await load() }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not restore team.'); setRestoreTarget(null) }
    finally { setBusyId(null) }
  }

  const openPermanent = (t: Team) => { setPermanentTarget(t); setConfirmText('') }
  const doPermanentDelete = async () => {
    if (!permanentTarget) return
    setBusyId(permanentTarget.teamId); setErr('')
    try {
      await adminApi.permanentDeleteTeam(permanentTarget.teamId, confirmText)
      flash(`"${permanentTarget.teamName}" permanently deleted.`)
      setPermanentTarget(null)
      await load()
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Could not permanently delete team.')
      setPermanentTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="hud-label mb-1">Registrations</p>
          <h1 className="text-3xl font-bold text-white">Deleted Teams</h1>
        </div>
        <Link to="/admin/teams" className="rounded-lg border border-white/15 px-4 py-2 font-mono text-xs uppercase tracking-widest text-slate-300 hover:bg-white/5">← Active Teams</Link>
      </div>

      {toast && <p role="status" className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{toast}</p>}
      {err && <p role="alert" className="mb-4 text-sm text-rose-300">{err}</p>}

      {teams !== null && teams.length === 0 ? (
        <div className="admin-glass p-10 text-center text-slate-400">No deleted teams.</div>
      ) : (
      <div className="admin-glass overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              {['Team ID', 'Team Name', 'Leader', 'Leader Email', 'Members', 'Deleted Date', 'Deleted By', 'Prev. Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-mono text-[0.6rem] uppercase tracking-widest">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {teams === null && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {teams?.map((t) => {
              const leader = t.leader as unknown as { name: string; email: string } | undefined
              const deletedBy = t.deletedBy as unknown as { name: string; email: string } | null | undefined
              return (
                <tr key={t.teamId} className="border-b border-white/5">
                  <td className="px-4 py-3 font-mono text-red-300">{t.teamId}</td>
                  <td className="px-4 py-3 text-white">{t.teamName}</td>
                  <td className="px-4 py-3 text-slate-300">{leader?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{leader?.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{(t.members ?? []).length + 1}</td>
                  <td className="px-4 py-3 text-slate-300">{t.deletedAt ? new Date(t.deletedAt).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{deletedBy?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{t.verificationStatus}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busyId === t.teamId} onClick={() => setRestoreTarget(t)} className="rounded border border-red-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-red-300 hover:bg-red-400/10 disabled:opacity-40">Restore</button>
                      {isSuper && <button disabled={busyId === t.teamId} onClick={() => openPermanent(t)} className="rounded border border-rose-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-rose-300 hover:bg-rose-400/10 disabled:opacity-40">Permanently Delete</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
      <Pager page={page} pages={pages} total={total} onPage={setPage} />

      {restoreTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-white">Restore this team?</p>
            <p className="mt-2 text-sm text-slate-400">"{restoreTarget.teamName}" will return to the normal Teams list.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setRestoreTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton onClick={doRestore} variant="solid" disabled={busyId === restoreTarget.teamId}>Restore Team</MagneticButton>
            </div>
          </div>
        </div>
      )}

      {permanentTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-md p-6 text-center">
            <p className="text-lg font-semibold text-rose-300">WARNING</p>
            <p className="mt-2 text-sm text-slate-300">This will permanently remove "{permanentTarget.teamName}" and all associated data (QR tokens, check-ins, OTPs, leader account). This action cannot be undone.</p>
            <p className="mt-4 text-xs text-slate-500">Type <span className="font-mono text-rose-300">DELETE TEAM</span> to confirm.</p>
            <input className="field mt-2 text-center" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE TEAM" />
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setPermanentTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button
                onClick={doPermanentDelete}
                disabled={confirmText !== 'DELETE TEAM' || busyId === permanentTarget.teamId}
                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
