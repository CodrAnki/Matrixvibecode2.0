import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import SectionTitle from './SectionTitle'
import MagneticButton from './MagneticButton'
import { DIFFICULTY, useOrderedProblems } from './ProblemsGrid'
import { RedactedRow, lockedCopy } from './ProblemsLocked'

const PREVIEW = 3

/** Homepage preview of the problem statements. Sealed until the reveal; the full briefs live on /problems. */
export default function ProblemsSection() {
  const { problems, loading, error, locked, previewDenied, phase } = useOrderedProblems()
  const sealed = locked || previewDenied
  const preview = problems.slice(0, PREVIEW)
  const more = problems.length - preview.length
  const copy = lockedCopy(phase)

  return (
    <section id="problems" aria-label="Problem statements" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          index="07"
          kicker="Problem statements"
          title={<>Pick your <span className="hl-green">challenge.</span></>}
          sub={sealed ? copy.text : "A first look at this year's challenges. Open the full list to read every brief."}
        />

        <ol className="border-t border-white/[0.12]" aria-live="polite">
          {loading
            ? Array.from({ length: PREVIEW }, (_, i) => (
                <li key={i} className="flex items-center gap-6 border-b border-white/[0.12] py-7" aria-hidden>
                  <span className="h-3 w-12 animate-pulse rounded bg-white/10" />
                  <span className="h-6 w-1/2 animate-pulse rounded bg-white/10" />
                </li>
              ))
            : sealed
              ? [1, 2, 3].map((n) => <RedactedRow key={n} n={n} />)
              : preview.length === 0
                ? (
                  <li className="border-b border-white/[0.12] py-7 text-slate-400">
                    {error
                      ? "Couldn't load the problem statements right now. The full list may still have them."
                      : 'No problem statements are published yet. Check back soon.'}
                  </li>
                )
                : preview.map((p, i) => {
                    const d = DIFFICULTY[p.difficulty] ?? DIFFICULTY.BEGINNER
                    return (
                      <li key={p._id} className="border-b border-white/[0.12]">
                        <Reveal delay={i * 0.08}>
                          <Link
                            to="/problems"
                            className="group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 py-6 outline-none transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.03] sm:grid-cols-[6rem_minmax(0,1fr)_auto_2rem] sm:gap-8 sm:py-7"
                          >
                            <span className="pl-1 font-mono text-xs tracking-[0.18em] text-[#C44552]">{p.problemId}</span>
                            <span className="display truncate text-xl text-[#F3F0E9] transition-colors group-hover:text-[#70D6A2] sm:text-[1.75rem]">
                              {p.title}
                            </span>
                            <span className={`rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] ${d.cls}`}>
                              {d.label}
                            </span>
                            <span aria-hidden className="hidden text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-[#38B878] sm:block">
                              →
                            </span>
                          </Link>
                        </Reveal>
                      </li>
                    )
                  })}
        </ol>

        <Reveal delay={0.15} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          {sealed ? (
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
              {phase === 'event-day' ? 'Event day / awaiting reveal' : 'Sealed until 14 October 2026'}
            </p>
          ) : (
            <>
              <MagneticButton to="/problems" variant="solid">
                View all problem statements →
              </MagneticButton>
              {more > 0 && (
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                  +{more} more on the full list
                </span>
              )}
            </>
          )}
        </Reveal>
      </div>
    </section>
  )
}
