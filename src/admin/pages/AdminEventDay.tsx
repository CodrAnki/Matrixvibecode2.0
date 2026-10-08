import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as eventApi from '../../api/eventApi'
import { ApiError } from '../../lib/api'
import { refreshEventState, useEventPhase, type Phase } from '../../lib/eventPhase'
import { clearSimulation, isSimulating, setSimulation, useSimulation, type SimPhase } from '../../lib/simulation'

const PHASE_LABEL: Record<Phase, string> = {
  countdown: 'Countdown (before event day)',
  'event-day': 'Event day, awaiting reveal',
  revealed: 'Problem statements revealed',
}

const SIM_OPTIONS: { value: SimPhase; label: string; hint: string }[] = [
  { value: 'auto', label: 'Real status', hint: 'Follow the actual date and reveal switch.' },
  { value: 'countdown', label: 'Countdown', hint: 'Hero shows the timer; registration open; problems sealed.' },
  { value: 'event-day', label: 'Event day', hint: '"The wait is over" in the hero; registration closed; problems sealed.' },
  { value: 'revealed', label: 'Revealed', hint: '"Problem statements are live" and the full list; registration closed.' },
]

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '')

export default function AdminEventDay() {
  const [state, setState] = useState<eventApi.AdminEventState | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const sim = useSimulation()
  const { realPhase } = useEventPhase()

  const load = useCallback(() => {
    eventApi.getAdminEventState().then(setState).catch((x) => setError(x instanceof ApiError ? x.message : 'Could not load event status.'))
  }, [])
  useEffect(load, [load])

  const flip = async (revealed: boolean) => {
    setBusy(true); setError('')
    try {
      await eventApi.setProblemsRevealed(revealed)
      setConfirming(false)
      load()
      void refreshEventState()
    } catch (x) {
      setError(x instanceof ApiError ? x.message : 'Could not update the reveal.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="hud-label mb-1">Event day</p>
      <h1 className="mb-6 text-3xl font-bold text-white">Problem statement reveal</h1>

      {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Live: affects every visitor ---------- */}
        <section className="admin-glass p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Official reveal</h2>
            <span className="rounded border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-rose-300">Live for everyone</span>
          </div>

          {!state ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <dl className="mb-5 grid gap-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-slate-400">Status</dt>
                  <dd className={state.problemsRevealed ? 'text-[#70D6A2]' : 'text-slate-200'}>
                    {state.problemsRevealed ? `Revealed ${fmt(state.problemsRevealedAt)}` : 'Hidden from participants'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-slate-400">Published problem statements</dt>
                  <dd className="text-slate-200">{state.publishedCount}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
                  <dt className="text-slate-400">Drafts (never revealed)</dt>
                  <dd className="text-slate-200">{state.draftCount}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Site is showing</dt>
                  <dd className="text-slate-200">{PHASE_LABEL[realPhase]}</dd>
                </div>
              </dl>

              <p className="mb-5 text-sm leading-relaxed text-slate-400">
                Revealing makes every <strong className="text-slate-200">published</strong> problem statement visible on the home page and the problem statements page,
                and flips the hero to "Problem statements are live". Visitors already on the site see it within 30 seconds.
              </p>

              {!state.problemsRevealed && state.publishedCount === 0 && (
                <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Nothing is published yet. <Link to="/admin/problems" className="underline">Publish at least one problem statement</Link> before revealing.
                </p>
              )}

              {!confirming ? (
                state.problemsRevealed ? (
                  <button disabled={busy} onClick={() => setConfirming(true)} className="btn btn-danger">Hide problem statements</button>
                ) : (
                  <button disabled={busy || state.publishedCount === 0} onClick={() => setConfirming(true)} className="btn btn-solid">Reveal problem statements</button>
                )
              ) : (
                <div className="rounded-lg border border-white/10 p-4">
                  <p className="mb-3 text-sm text-slate-200">
                    {state.problemsRevealed
                      ? 'Hide all problem statements from participants again?'
                      : `Reveal ${state.publishedCount} problem statement${state.publishedCount === 1 ? '' : 's'} to every participant now?`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busy} onClick={() => flip(!state.problemsRevealed)} className={`btn ${state.problemsRevealed ? 'btn-danger' : 'btn-solid'}`}>
                      {busy ? 'Working…' : state.problemsRevealed ? 'Yes, hide them' : 'Yes, reveal now'}
                    </button>
                    <button disabled={busy} onClick={() => setConfirming(false)} className="btn">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ---------- Testing: this browser only ---------- */}
        <section className="admin-glass p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Testing</h2>
            <span className="rounded border border-white/15 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest text-slate-400">This browser only</span>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-slate-400">
            Preview how the public site looks in each phase. These settings change only what <strong className="text-slate-200">this browser</strong> shows;
            participants are never affected. Open the site in another tab while you switch.
          </p>

          <fieldset className="mb-5">
            <legend className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-red-200/70">Simulate phase</legend>
            <div className="grid gap-2">
              {SIM_OPTIONS.map((o) => (
                <label key={o.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${sim.phase === o.value ? 'border-[#38B878]/60 bg-[#38B878]/5' : 'border-white/10 hover:border-white/20'}`}>
                  <input
                    type="radio"
                    name="sim-phase"
                    className="mt-1 accent-[#38B878]"
                    checked={sim.phase === o.value}
                    onChange={() => setSimulation({ ...sim, phase: o.value })}
                  />
                  <span>
                    <span className="block text-sm text-slate-200">{o.label}</span>
                    <span className="block text-xs text-slate-500">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#38B878]"
              checked={sim.showProblems}
              onChange={(e) => setSimulation({ ...sim, showProblems: e.target.checked })}
            />
            <span>
              <span className="block text-sm text-slate-200">Show problem statements (preview)</span>
              <span className="block text-xs text-slate-500">
                Shows the published problem statements on the home page and /problems in this browser, before the official reveal. Drafts are never shown.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="btn btn-sm">Open site ↗</a>
            <a href="/problems" target="_blank" rel="noreferrer" className="btn btn-sm">Open problem statements ↗</a>
            {isSimulating(sim) && <button onClick={clearSimulation} className="btn btn-sm btn-danger">Stop testing</button>}
          </div>
        </section>
      </div>
    </>
  )
}
