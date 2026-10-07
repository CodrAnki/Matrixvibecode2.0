import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, EyeOff, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useProblems } from '../hooks/useProblems'
import type { ProblemStatement } from '../lib/types'
import Reveal from './Reveal'
import SectionHead from './SectionHead'
import Countdown from './Countdown'

const LEVEL: Record<ProblemStatement['difficulty'], { label: string; n: number }> = {
  BEGINNER: { label: 'Beginner', n: 1 },
  INTERMEDIATE: { label: 'Intermediate', n: 2 },
  ADVANCED: { label: 'Advanced', n: 3 },
}

function Level({ d }: { d: ProblemStatement['difficulty'] }) {
  const l = LEVEL[d] ?? LEVEL.BEGINNER
  return (
    <span className="inline-flex items-center gap-2" aria-label={`Difficulty: ${l.label}`}>
      <span className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 w-4 ${i <= l.n ? 'bg-accent' : 'bg-white/15'}`} />)}
      </span>
      <span className="meta">{l.label}</span>
    </span>
  )
}

const Detail = ({ label, value }: { label: string; value?: string }) =>
  value?.trim() ? (
    <div>
      <p className="meta !text-accent">{label}</p>
      <p className="mt-1 whitespace-pre-line break-words text-paper/80">{value}</p>
    </div>
  ) : null

function Row({ p, n, open, onToggle }: { p: ProblemStatement; n: number; open: boolean; onToggle: () => void }) {
  const summary = p.shortDescription?.trim() || p.description?.trim() || ''
  const full = p.description?.trim() && p.description.trim() !== summary ? p.description.trim() : ''
  const tags = p.tags ?? []
  return (
    <li className="border-b border-white/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="row-hover group grid w-full grid-cols-[3.2rem_1fr] gap-x-4 gap-y-3 px-1 py-6 text-left md:grid-cols-[6.5rem_1fr_12rem_9rem] md:items-start md:gap-x-8 md:px-3 md:py-9"
      >
        <span className={`display text-4xl transition-colors duration-300 md:text-6xl ${open ? 'text-accent' : 'text-paper/30 group-hover:text-accent'}`}>{String(n).padStart(2, '0')}</span>
        <span className="min-w-0">
          <span className="meta block">PS {String(n).padStart(2, '0')}{p.problemId ? ` / ${p.problemId}` : ''}</span>
          <span className="mt-1.5 block break-words font-display text-[1.65rem] font-bold leading-[1.05] tracking-[-0.02em] text-paper md:text-4xl">{p.title}</span>
          {summary && <span className={`mt-3 block max-w-2xl break-words text-base leading-relaxed text-silver ${open ? 'hidden' : 'line-clamp-2'}`}>{summary}</span>}
        </span>
        <span className="col-start-2 flex flex-col gap-2 md:col-start-auto md:pt-6">
          {p.category && <span className="meta !text-paper">{p.category}</span>}
          <Level d={p.difficulty} />
        </span>
        <span className="col-start-2 flex items-center gap-2 whitespace-nowrap font-mono text-[0.7rem] uppercase tracking-[0.14em] text-silver transition-colors group-hover:text-accent md:col-start-auto md:justify-end md:pt-6">
          {open ? <>Close <Minus className="h-4 w-4" strokeWidth={1.75} /></> : <>View problem <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} /></>}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="grid gap-6 pb-9 pl-[4.45rem] pr-1 text-base leading-relaxed md:grid-cols-[1.4fr_1fr] md:gap-12 md:pl-[9.25rem] md:pr-3">
              <div className="grid gap-5">
                <p className="whitespace-pre-line break-words text-lg text-paper/90">{summary}</p>
                <Detail label="Description" value={full} />
                <Detail label="Constraints" value={p.constraints} />
                <Detail label="Input" value={p.inputFormat} />
                <Detail label="Output" value={p.outputFormat} />
              </div>
              <div className="flex flex-col items-start gap-5 md:border-l md:border-white/10 md:pl-8">
                {tags.length > 0 && <p className="meta">{tags.join('  /  ')}</p>}
                <p className="text-sm text-silver">Register to take on this challenge.</p>
                <Link to="/register" className="btn btn-solid">Register <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** Problem statements for Vibe Coding 2.0: every published statement from the existing problems API, as a browsable challenge archive. */
export default function ProblemsSection() {
  const { items, loading, error, reload } = useProblems()
  const [cat, setCat] = useState('All')
  const [openId, setOpenId] = useState<string | null>(null)
  // API returns newest first; show oldest first so ids read in order (PS 01, PS 02, ...). Numbers come from this order, before filtering.
  const problems = useMemo(() => [...items].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')), [items])
  const cats = useMemo(() => ['All', ...Array.from(new Set(problems.map((p) => p.category?.trim()).filter(Boolean) as string[]))], [problems])
  // Statements are revealed on event day: until some are published (or while the API is slow/unreachable) show the reveal panel.
  const published = problems.length > 0
  const shown = problems.map((p, i) => ({ p, n: i + 1 })).filter(({ p }) => cat === 'All' || p.category?.trim() === cat)

  return (
    <section id="problems" aria-label="Problem statements" className="relative px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        {published ? (
          <SectionHead index="02" label="Problem statements" title={<>Pick your<br />challenge.</>}>
            Real problems to build against. Open any statement for the full brief, then register to lock yours in.
          </SectionHead>
        ) : (
          <SectionHead index="02" label="Problem statements" title={<>Revealed on<br />the day.</>}>
            The problem statements are announced on the day of the event, so everyone starts at the same time.
          </SectionHead>
        )}

        {!published ? (
          <Reveal>
            <div className="grid gap-10 border-y border-white/15 py-10 md:grid-cols-[1fr_auto] md:items-center md:py-14">
              <div>
                <p className="meta flex items-center gap-2 !text-accent"><EyeOff className="h-4 w-4" strokeWidth={1.75} />Locked until event day</p>
                <p className="display mt-4 text-[clamp(2rem,4.5vw,3.6rem)] text-paper">14 October 2026</p>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-silver">
                  Register solo or as a duo, and the problem statement is revealed when the event starts. Announcements will appear under Updates below.
                </p>
              </div>
              <div>
                <p className="meta mb-3">Event starts in</p>
                <Countdown />
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/register" className="btn btn-solid btn-lg">Register now <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
              {error && !loading && (
                <p className="meta">
                  Couldn't check for published statements.{' '}
                  <button type="button" onClick={reload} className="u-link text-paper">Try again</button>
                </p>
              )}
            </div>
          </Reveal>
        ) : (
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <p className="meta">{shown.length} of {problems.length} problem statements</p>
              {cats.length > 2 && (
                <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
                  {cats.map((c) => (
                    <button key={c} type="button" onClick={() => { setCat(c); setOpenId(null) }} aria-pressed={cat === c} className={`min-h-[2.5rem] rounded-sm border px-3.5 font-mono text-[0.68rem] uppercase tracking-[0.12em] transition-colors ${cat === c ? 'border-accent bg-accent text-ink' : 'border-white/20 text-silver hover:border-paper hover:text-paper'}`}>{c}</button>
                  ))}
                </div>
              )}
            </div>
            <ul className="border-t border-white/15">
              {shown.map(({ p, n }) => <Row key={p._id} p={p} n={n} open={openId === p._id} onToggle={() => setOpenId(openId === p._id ? null : p._id)} />)}
            </ul>

            {/* Conversion prompt directly after the list */}
            <div className="mt-12 grid items-center gap-6 border border-white/15 bg-ink-2/80 p-6 md:grid-cols-[1fr_auto] md:p-10">
              <div>
                <p className="meta !text-accent">Ready to build?</p>
                <p className="display mt-2 text-[clamp(1.8rem,4vw,3rem)] text-paper">Register for Vibe Coding 2.0</p>
              </div>
              <Link to="/register" className="btn btn-solid btn-lg justify-self-start md:justify-self-end">Register now <ArrowRight className="h-4 w-4" strokeWidth={2} /></Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}
