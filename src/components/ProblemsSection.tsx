import { useMemo } from 'react'
import { useProblems } from '../hooks/useProblems'
import type { ProblemStatement } from '../lib/types'
import HoloCard from './HoloCard'
import Reveal from './Reveal'
import SectionTitle from './SectionTitle'
import MagneticButton from './MagneticButton'
import { CardSkeletons, StateMessage } from './SectionStates'

const DIFFICULTY: Record<ProblemStatement['difficulty'], { label: string; cls: string }> = {
  BEGINNER: { label: 'Beginner', cls: 'border-red-400/40 text-red-300' },
  INTERMEDIATE: { label: 'Intermediate', cls: 'border-red-400/40 text-red-200' },
  ADVANCED: { label: 'Advanced', cls: 'border-rose-400/40 text-rose-300' },
}

const Detail = ({ label, value }: { label: string; value?: string }) =>
  value?.trim() ? (
    <div>
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#C44552]/80">{label}</p>
      <p className="mt-1 whitespace-pre-line break-words">{value}</p>
    </div>
  ) : null

/** Homepage "Problem Statements" section: every published problem statement from the existing problems API. */
export default function ProblemsSection() {
  const { items, loading, error, reload } = useProblems()
  // API returns newest first; show oldest first so ids read in order (PS-1, PS-2, ...).
  const problems = useMemo(() => [...items].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')), [items])

  return (
    <section id="problems" aria-label="Problem statements" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle kicker="Challenges" title="Problem Statements" sub="Pick the challenge that fits your team. Tap a card to see the full brief." />

        {loading ? (
          <CardSkeletons />
        ) : error ? (
          <StateMessage tone="error" title="Couldn't load problem statements" action={<MagneticButton onClick={reload} size="sm">Try again</MagneticButton>}>
            Something went wrong while fetching the problem statements. Please check your connection and try again.
          </StateMessage>
        ) : problems.length === 0 ? (
          <StateMessage title="Problem statements coming soon">The organizers haven't published any problem statements yet. Check back soon.</StateMessage>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
            {problems.map((p, i) => {
              const d = DIFFICULTY[p.difficulty] ?? DIFFICULTY.BEGINNER
              const summary = p.shortDescription?.trim() || p.description?.trim() || ''
              // Open card shows the full description only if the summary above is something shorter.
              const full = p.description?.trim() && p.description.trim() !== summary ? p.description.trim() : ''
              const hasMore = Boolean(full || p.constraints?.trim() || p.inputFormat?.trim() || p.outputFormat?.trim())
              return (
                <Reveal key={p._id} delay={(i % 3) * 0.1} className="h-full">
                  <HoloCard
                    code={p.problemId}
                    badge={d.label}
                    badgeClass={d.cls}
                    title={p.title}
                    text={summary || undefined}
                    clampText={summary.length > 160}
                    details={hasMore ? (
                      <div className="grid gap-3">
                        <Detail label="Description" value={full} />
                        <Detail label="Constraints" value={p.constraints} />
                        <Detail label="Input" value={p.inputFormat} />
                        <Detail label="Output" value={p.outputFormat} />
                      </div>
                    ) : undefined}
                    tags={[...(p.category ? [p.category] : []), ...(p.tags ?? [])]}
                  />
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
