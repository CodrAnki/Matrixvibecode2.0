import PageHeader from '../components/PageHeader'
import Pipeline from '../components/Pipeline'
import { useAuth } from '../context/AuthContext'
import { WORKFLOW } from '../data/event'
import { pipelineStep } from '../lib/pipeline'

export default function WorkflowPage() {
  const { team } = useAuth()
  if (!team) return null
  return (
    <>
      <PageHeader kicker="Pipeline" title="Workflow" sub="Your team’s progress through the event, and what each stage means." />
      <section className="glass hud-corners relative p-6 md:p-8">
        <Pipeline completed={pipelineStep(team)} showDesc />
      </section>
      <section className="glass mt-6 p-6">
        <p className="hud-label mb-5">Event roadmap</p>
        <ol className="grid gap-4 md:grid-cols-2">
          {WORKFLOW.map((w, i) => (
            <li key={w.title} className="flex gap-4 rounded-xl border border-cyan-400/10 bg-white/[0.02] p-4">
              <span className="font-mono text-sm text-cyan-300">{String(i + 1).padStart(2, '0')}</span>
              <div><p className="font-mono text-xs tracking-[0.2em] text-white">{w.title}</p><p className="mt-1 text-sm text-sky-100/60">{w.text}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}
