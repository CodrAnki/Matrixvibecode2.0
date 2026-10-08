import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Pipeline, { STAGES } from '../components/Pipeline'
import TiltCard from '../components/TiltCard'
import MagneticButton from '../components/MagneticButton'
import { useAuth } from '../context/AuthContext'
import * as announcementApi from '../api/announcementApi'
import type { Announcement } from '../lib/types'
import { pipelineStep } from '../lib/pipeline'

export default function Dashboard() {
  const { team } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!team) return
    announcementApi.listAnnouncements()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([])) // announcements are non-essential: a failed fetch shows the empty state, never a crash
      .finally(() => setLoading(false))
  }, [team])

  if (!team) return null
  const completed = pipelineStep(team)
  const stage = STAGES[Math.min(completed, STAGES.length - 1)].key
  const statusText = team.verificationStatus

  return (
    <>
      <PageHeader kicker="Mission control" title="Team Dashboard" sub={`Welcome back, ${team.teamName}`} right={<div className="glass px-4 py-2 font-mono text-xs tracking-widest text-red-200">ID · {team.teamId}</div>} />

      <section className="glass hud-corners relative p-6 md:p-8">
        <p className="hud-label mb-6">Progress pipeline</p>
        <Pipeline completed={completed} />
      </section>

      <section className="glass hud-corners relative mt-6 p-6">
        <p className="hud-label mb-4">Team information</p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-400">Team Name</dt><dd className="mt-1 text-lg font-bold text-white">{team.teamName}</dd></div>
          {team.teamYear && (
            <div><dt className="text-slate-400">Team Year</dt><dd className="mt-1"><span className="inline-block rounded border border-[#F4F4F5]/40 bg-[#F4F4F5]/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-red-200">{team.teamYear}</span></dd></div>
          )}
        </dl>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2" style={{ perspective: 1200 }}>
        {[
          { k: 'Team status', v: statusText, s: `${1 + team.members.length} member${team.members.length ? 's' : ''} · ${team.college ?? '—'}` },
          { k: 'Current stage', v: stage, s: `${Math.min(completed, STAGES.length)} of ${STAGES.length} stages complete` },
        ].map((c) => (
          <TiltCard key={c.k} className="p-6">
            <p className="hud-label">{c.k}</p>
            <p className="mt-4 text-xl font-bold tracking-wide text-white [text-shadow:0_0_20px_rgba(196,69,82,0.2)]">{c.v}</p>
            <p className="mt-2 truncate text-sm text-slate-100/55">{c.s}</p>
          </TiltCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="glass p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="hud-label">Recent announcements</p>
            <Link to="/dashboard/announcements" className="font-mono text-[0.65rem] uppercase tracking-widest text-red-300 hover:text-red-100">View all →</Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <ul className="divide-y divide-red-400/10">
              {announcements.slice(0, 3).map((a) => (
                <li key={a._id} className="py-4">
                  <span className="rounded border border-red-400/30 px-2 py-0.5 font-mono text-[0.58rem] tracking-widest text-red-200">{a.type}</span>
                  <p className="mt-2 font-semibold text-white">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-100/60">{a.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="glass p-6">
          <p className="hud-label mb-5">Quick actions</p>
          <div className="grid gap-3">
            <MagneticButton to="/dashboard/team" variant="solid" className="w-full">Manage team</MagneticButton>
            <MagneticButton to="/dashboard/qr" className="w-full">Team QR</MagneticButton>
            <MagneticButton to="/dashboard/workflow" className="w-full">View workflow</MagneticButton>
          </div>
        </section>
      </div>
    </>
  )
}
