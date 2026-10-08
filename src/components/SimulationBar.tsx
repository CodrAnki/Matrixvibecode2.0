import { Link, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { clearSimulation, isSimulating, useSimulation, type SimPhase } from '../lib/simulation'

const LABEL: Record<SimPhase, string> = {
  auto: 'Real status',
  countdown: 'Countdown',
  'event-day': 'Event day',
  revealed: 'Revealed',
}

/** Shown on the public site while an admin testing simulation is active, so it is never mistaken
 *  for the real state. Visible only in the browser that set the simulation. */
export default function SimulationBar() {
  const sim = useSimulation()
  const { admin, loading } = useAdminAuth()
  const { pathname } = useLocation()
  if (!isSimulating(sim) || pathname.startsWith('/admin')) return null

  const wantsProblems = sim.showProblems || sim.phase === 'revealed'
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-[60] rounded border border-amber-400/40 bg-[#0b0b0c]/95 p-3 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-slate-300 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.9)] sm:right-auto sm:max-w-sm"
    >
      <p className="text-amber-300">Test mode / this browser only</p>
      <p className="mt-1">
        Phase: {LABEL[sim.phase]} · Problems: {wantsProblems ? 'preview' : 'sealed'}
      </p>
      {wantsProblems && !loading && !admin && (
        <p className="mt-2 normal-case tracking-normal text-rose-300">
          Problem preview needs an admin session. Sign in to the admin panel in this browser.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Link to="/admin/event-day" className="btn btn-sm">Controls</Link>
        <button onClick={clearSimulation} className="btn btn-sm btn-danger">Exit test mode</button>
      </div>
    </div>
  )
}
