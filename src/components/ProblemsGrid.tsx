import { useMemo } from 'react'
import { useProblems } from '../hooks/useProblems'
import type { ProblemStatement } from '../lib/types'
import HoloCard from './HoloCard'
import Reveal from './Reveal'
import MagneticButton from './MagneticButton'
import { CardSkeletons, StateMessage } from './SectionStates'
import ProblemsLocked from './ProblemsLocked'

export const DIFFICULTY: Record<ProblemStatement['difficulty'], { label: string; cls: string }> = {
  BEGINNER: { label: 'Beginner', cls: 'border-red-400/40 text-red-300' },
  INTERMEDIATE: { label: 'Intermediate', cls: 'border-red-400/40 text-red-200' },
  ADVANCED: { label: 'Advanced', cls: 'border-rose-400/40 text-rose-300' },
}

/** Problems oldest-first, so ids read in order (PS-1, PS-2, ...). The API returns newest first. */
export function useOrderedProblems() {
  const state = useProblems()
  const problems = useMemo(
    () => [...state.items].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
    [state.items],
  )
  return { ...state, problems }
}

const Detail = ({ label, value }: { label: string; value?: string }) =>
  value?.trim() ? (
    <div>
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-[#C44552]/80">{label}</p>
      <p className="mt-1 whitespace-pre-line break-words">{value}</p>
    </div>
  ) : null

/** Every published problem statement as an expandable card, with loading / error / empty states. */
export default function ProblemsGrid() {
  const { problems, loading, error, reload, locked, previewDenied, phase } = useOrderedProblems()

  if (loading) return <CardSkeletons />
  if (locked || previewDenied) return <ProblemsLocked phase={phase} />
  if (error) {
    return (
      <StateMessage tone="error" title="Couldn't load problem statements" action={<MagneticButton onClick={reload} size="sm">Try again</MagneticButton>}>
        Something went wrong while fetching the problem statements. Please check your connection and try again.
      </StateMessage>
    )
  }
  if (problems.length === 0) {
    return <StateMessage title="Problem statements coming soon">The organizers haven't published any problem statements yet. Check back soon.</StateMessage>
  }

  return (
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
  )
}
