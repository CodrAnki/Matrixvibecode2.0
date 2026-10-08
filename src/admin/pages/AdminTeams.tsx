import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as adminApi from '../../api/adminApi'
import type { Team } from '../../lib/types'
import { ApiError } from '../../lib/api'
import MagneticButton from '../../components/MagneticButton'
import { useAdminAuth } from '../AdminAuthContext'
import Pager from '../Pager'
import { useFlash } from '../../hooks/useFlash'
import { IconCheck } from '../../components/Icons'
import ConfirmButton from '../../components/ConfirmButton'
import { STATUS_BADGE } from '../teamStatus'

export default function AdminTeams() {
  const { admin } = useAdminAuth()
  const isSuper = admin?.role === 'SUPER_ADMIN'
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const [q, setQ] = useState(params.get('q') ?? '') // text box
  const [query, setQuery] = useState(params.get('q') ?? '') // submitted search
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [teams, setTeams] = useState<Team[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [confirmTestCleanup, setConfirmTestCleanup] = useState(false)
  const [toast, flash] = useFlash()
  const reqId = useRef(0) // ignore out-of-order responses (fast clicking / typing)

  const load = useCallback(() => {
    const id = ++reqId.current
    setLoading(true)
    adminApi.listTeams({ status: status || undefined, q: query || undefined, page })
      .then((r) => {
        if (id !== reqId.current) return
        if ((r.teams ?? []).length === 0 && page > 1) { setPage(page - 1); return } // last row of a page was deleted
        setTeams(r.teams ?? []); setTotal(r.total ?? 0); setPages(Math.max(1, r.pages ?? 1)); setErr('')
      })
      .catch((x) => { if (id === reqId.current) setErr(x instanceof ApiError ? x.message : 'Could not load teams.') })
      .finally(() => { if (id === reqId.current) setLoading(false) })
  }, [status, query, page])

  useEffect(() => { load() }, [load])

  const act = async (fn: (id: string) => Promise<unknown>, teamId: string) => {
    setBusyId(teamId); setErr('')
    try { await fn(teamId); load() }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Action failed.') }
    finally { setBusyId(null) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.teamId); setErr('')
    try {
      // Real soft delete: DELETE /api/admin/teams/:teamId sets isDeleted/deletedAt/deletedBy in MongoDB.
      // The row is only removed from the list by re-fetching from the server, never by local state surgery.
      await adminApi.deleteTeam(deleteTarget.teamId)
      flash(`"${deleteTarget.teamName}" moved to Deleted Teams.`)
      setDeleteTarget(null); load()
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not delete team.'); setDeleteTarget(null) }
    finally { setBusyId(null) }
  }

  const runTestCleanup = async () => {
    setConfirmTestCleanup(false)
    try { const r = await adminApi.deleteTestTeams(); flash(`${r.deletedCount} test team(s) moved to Deleted Teams.`); setErr(''); load() }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not delete test teams.') }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="hud-label mb-1">Registrations</p>
          <h1 className="text-3xl font-bold text-white">Teams <span className="text-slate-500">({total})</span></h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={(e) => { e.preventDefault(); setParams((p) => { p.set('q', q); return p }); setPage(1); setQuery(q.trim()) }} className="flex gap-2">
            <input className="field !w-56" placeholder="Search team / ID…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="rounded-lg border border-red-400/30 px-4 font-mono text-xs uppercase tracking-widest text-red-200">Search</button>
          </form>
          <Link to="/admin/teams/deleted" className="rounded-lg border border-white/15 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-slate-300 hover:bg-white/5">Deleted Teams</Link>
          {isSuper && <button onClick={() => setConfirmTestCleanup(true)} className="rounded-lg border border-amber-400/30 px-4 py-2.5 font-mono text-xs uppercase tracking-widest text-amber-300 hover:bg-amber-400/10">Delete Test Teams</button>}
        </div>
      </div>

      {toast && <p role="status" className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">{toast}</p>}

      <div className="mb-5 flex flex-wrap gap-2">
        {['', 'PENDING', 'CHANGES_REQUIRED', 'VERIFIED', 'REJECTED'].map((s) => (
          <button key={s || 'all'} onClick={() => { setPage(1); setParams(s ? { status: s } : {}) }} className={`rounded-full border px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest transition-colors ${status === s ? 'border-red-400/50 bg-red-400/15 text-red-100' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}>{s ? STATUS_BADGE[s].label : 'All'}</button>
        ))}
      </div>

      {err && <p role="alert" className="mb-4 text-sm text-rose-300">{err}</p>}
      <div className="admin-glass overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              {['Team ID', 'Team Name', 'Team Year', 'Leader', 'Members', 'Status', 'Check-in', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-mono text-[0.6rem] uppercase tracking-widest">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && teams.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">No teams found.</td></tr>}
            {teams.map((t) => (
              <tr key={t.teamId} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-mono text-red-300"><Link to={`/admin/teams/${t.teamId}`}>{t.teamId}</Link></td>
                <td className="px-4 py-3 text-white">{t.teamName}</td>
                <td className="px-4 py-3">{t.teamYear ? <span className="rounded border border-[#F4F4F5]/40 bg-[#F4F4F5]/10 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-red-200">{t.teamYear}</span> : <span className="text-slate-500">Not specified</span>}</td>
                <td className="px-4 py-3 text-slate-300">{t.leader && typeof t.leader === 'object' ? (t.leader as { name: string }).name : '—'}</td>
                <td className="px-4 py-3 text-slate-300">{(t.members ?? []).length + 1}</td>
                <td className="px-4 py-3">
                  <span className={`whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest ${STATUS_BADGE[t.verificationStatus]?.cls ?? ''}`}>{STATUS_BADGE[t.verificationStatus]?.label ?? t.verificationStatus}</span>
                  {t.disabled && <span className="ml-1.5 whitespace-nowrap rounded border border-rose-400/40 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-rose-200">Disabled</span>}
                </td>
                <td className="px-4 py-3 text-slate-300">{t.checkedIn ? <IconCheck className="h-3.5 w-3.5 text-[#38B878]" /> : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {t.verificationStatus !== 'VERIFIED' && !t.disabled && (
                      <button disabled={busyId === t.teamId} onClick={() => act((id) => adminApi.verifyTeam(id), t.teamId)} className="rounded border border-[#38B878]/40 px-2 py-1 font-mono text-[0.58rem] uppercase text-[#A9E7C4] hover:bg-[#38B878]/10 disabled:opacity-40">Verify</button>
                    )}
                    {/* A checked-in team can't be rejected (server enforces it too), and rejecting is confirmed first. */}
                    {t.verificationStatus !== 'REJECTED' && !t.checkedIn && (
                      <ConfirmButton
                        disabled={busyId === t.teamId}
                        message={`Reject ${t.teamName}?`}
                        confirmLabel="Yes, reject"
                        onConfirm={() => act((id) => adminApi.rejectTeam(id), t.teamId)}
                        className="rounded border border-rose-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
                      >Reject</ConfirmButton>
                    )}
                    <Link to={`/admin/teams/${t.teamId}`} className="rounded border border-white/15 px-2 py-1 font-mono text-[0.58rem] uppercase text-slate-300 hover:bg-white/5">View Team</Link>
                    <button disabled={busyId === t.teamId} onClick={() => setDeleteTarget(t)} className="rounded border border-rose-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-rose-300 hover:bg-rose-400/10 disabled:opacity-40">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} total={total} busy={loading} onPage={setPage} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-white">Delete Team?</p>
            <p className="mt-2 text-sm text-slate-400">"{deleteTarget.teamName}" will be moved to Deleted Teams and will no longer appear in the active registrations list. You can restore it later.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton onClick={confirmDelete} variant="solid" disabled={busyId === deleteTarget.teamId}>Delete Team</MagneticButton>
            </div>
          </div>
        </div>
      )}

      {confirmTestCleanup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-white">Delete all test teams?</p>
            <p className="mt-2 text-sm text-slate-400">This only affects teams explicitly marked as test/dummy data. Real registrations are never touched. They'll be moved to Deleted Teams, not permanently removed.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setConfirmTestCleanup(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton onClick={runTestCleanup} variant="solid">Delete Test Teams</MagneticButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
