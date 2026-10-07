import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useAnnouncements } from '../hooks/useAnnouncements'

// Read/unread state is purely a local UI preference (not a credential), so localStorage is fine here.
const readKey = (teamId: string) => `matrix.vc2.read.${teamId}`
const getRead = (teamId: string): string[] => { try { return JSON.parse(localStorage.getItem(readKey(teamId)) ?? '[]') } catch { return [] } }
const setReadIds = (teamId: string, ids: string[]) => { try { localStorage.setItem(readKey(teamId), JSON.stringify(ids)) } catch { /* ignore */ } }

export default function Announcements() {
  const { team } = useAuth()
  const { items, loading } = useAnnouncements(20000)
  const [read, setR] = useState<string[]>(() => (team ? getRead(team.teamId) : []))

  if (!team) return null
  const toggle = (id: string) => {
    const next = read.includes(id) ? read.filter((x) => x !== id) : [...read, id]
    setR(next); setReadIds(team.teamId, next)
  }
  const unread = items.filter((a) => !read.includes(a._id)).length

  return (
    <>
      <PageHeader kicker="Comms" title="Announcements" sub={loading ? 'Loading…' : `${unread} unread`} />
      <div className="grid gap-4">
        {!loading && items.length === 0 && <p className="text-sm text-slate-400">No announcements yet — check back soon.</p>}
        {items.map((a) => {
          const isRead = read.includes(a._id)
          return (
            <article key={a._id} className={`glass p-6 transition-opacity ${isRead ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {!isRead && <span className="blink h-2 w-2 rounded-full bg-cyan-300" />}
                  <span className="rounded border border-cyan-400/30 px-2 py-0.5 font-mono text-[0.58rem] tracking-widest text-cyan-200">{a.type}</span>
                  {a.priority === 'URGENT' && <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-rose-300">Urgent</span>}
                </div>
                <button onClick={() => toggle(a._id)} className="font-mono text-[0.65rem] uppercase tracking-widest text-cyan-300 hover:text-cyan-100">{isRead ? 'Mark unread' : 'Mark as read'}</button>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-white">{a.title}</h2>
              <p className="mt-2 text-sky-100/65"><span className="whitespace-pre-line">{a.message}</span></p>
            </article>
          )
        })}
      </div>
    </>
  )
}
