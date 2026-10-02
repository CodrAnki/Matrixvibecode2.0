import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as adminApi from '../../api/adminApi'

const CARDS: { key: Exclude<keyof adminApi.DashboardStats, 'latestAnnouncement'>; label: string }[] = [
  { key: 'totalTeams', label: 'Active Teams' },
  { key: 'verifiedTeams', label: 'Verified Teams' },
  { key: 'pendingTeams', label: 'Pending Teams' },
  { key: 'rejectedTeams', label: 'Rejected Teams' },
  { key: 'deletedTeams', label: 'Deleted Teams' },
  { key: 'totalAnnouncements', label: 'Total Announcements' },
  { key: 'publishedAnnouncements', label: 'Published Announcements' },
  { key: 'draftAnnouncements', label: 'Draft Announcements' },
  { key: 'checkedInTeams', label: 'Checked-in Teams' },
  { key: 'adminAccounts', label: 'Admin Accounts' },
]

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span className="text-white">{value}</span></div>
      <div className="h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-[#00FF66] to-[#00D9FF]" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<{ stats: adminApi.DashboardStats; charts: adminApi.DashboardCharts } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    adminApi.getDashboard().then(setData).catch(() => setErr('Could not load dashboard stats.'))
  }, [])

  return (
    <>
      <p className="hud-label mb-1">MATRIX Command Center</p>
      <h1 className="mb-6 text-3xl font-bold text-white">Dashboard</h1>
      {err && <p role="alert" className="mb-4 text-sm text-rose-300">{err}</p>}
      {!data ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARDS.map((c) => (
              <div key={c.key} className="admin-glass p-5">
                <p className="hud-label">{c.label}</p>
                <p className="mt-3 text-3xl font-bold text-white [text-shadow:0_0_18px_rgba(0,217,255,0.4)]">{data.stats[c.key]}</p>
              </div>
            ))}
          </div>

          <div className="admin-glass mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <p className="hud-label">Latest Announcement</p>
              {data.stats.latestAnnouncement ? (
                <p className="mt-2 break-words text-white">{data.stats.latestAnnouncement.title}
                  <span className="ml-2 rounded border border-cyan-400/30 px-2 py-0.5 font-mono text-[0.58rem] uppercase text-cyan-200">{data.stats.latestAnnouncement.status}</span>
                </p>
              ) : <p className="mt-2 text-sm text-slate-500">No announcements yet.</p>}
            </div>
            <Link to="/admin/announcements?new=1" className="rounded-lg border border-[#00FF66]/40 bg-[#00FF66]/10 px-4 py-2 font-mono text-xs uppercase tracking-widest text-[#00FF66] hover:bg-[#00FF66]/20">+ Create Announcement</Link>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="admin-glass p-6">
              <p className="hud-label mb-4">College-wise teams</p>
              <div className="grid gap-3">
                {data.charts.collegeWise.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
                {data.charts.collegeWise.map((c) => (
                  <Bar key={c._id ?? 'unknown'} label={c._id ?? 'Unknown'} value={c.count} max={data.charts.collegeWise[0]?.count ?? 1} />
                ))}
              </div>
            </div>
            <div className="admin-glass p-6 lg:col-span-2">
              <p className="hud-label mb-4">Registrations over time</p>
              <div className="flex items-end gap-2 overflow-x-auto pb-2">
                {data.charts.registrationsByDay.length === 0 && <p className="text-sm text-slate-500">No registrations yet.</p>}
                {data.charts.registrationsByDay.map((d) => {
                  const max = Math.max(...data.charts.registrationsByDay.map((x) => x.count), 1)
                  return (
                    <div key={d._id ?? 'unknown'} className="flex flex-col items-center gap-1">
                      <div className="w-6 rounded-t bg-gradient-to-t from-[#008CFF] to-[#00FF66]" style={{ height: `${(d.count / max) * 100 + 8}px` }} />
                      <span className="whitespace-nowrap font-mono text-[0.55rem] text-slate-500">{(d._id ?? '').slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
