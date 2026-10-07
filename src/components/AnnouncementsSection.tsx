import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ArrowUpRight, Clock, Megaphone, Settings, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useAnnouncements } from '../hooks/useAnnouncements'
import type { Announcement } from '../lib/types'
import Reveal from './Reveal'
import SectionHead from './SectionHead'
import MagneticButton from './MagneticButton'
import { CardSkeletons, StateMessage } from './SectionStates'

const isHot = (a: Announcement) => a.priority === 'URGENT' || a.type === 'IMPORTANT'

const TYPE: Record<Announcement['type'], { Icon: LucideIcon; label: string; cls: string }> = {
  GENERAL: { Icon: Megaphone, label: 'General', cls: 'text-silver' },
  IMPORTANT: { Icon: AlertCircle, label: 'Important', cls: 'text-amber' },
  DEADLINE: { Icon: Clock, label: 'Deadline', cls: 'text-amber' },
  SYSTEM: { Icon: Settings, label: 'System', cls: 'text-silver' },
}

const when = (a: Announcement) => new Date(a.publishedAt ?? a.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })

function Row({ a, i }: { a: Announcement; i: number }) {
  const [open, setOpen] = useState(false)
  const t = TYPE[a.type] ?? TYPE.GENERAL
  const long = a.message.length > 0
  return (
    <li className="border-b border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!long}
        className="row-hover group grid w-full grid-cols-[2.2rem_1fr_auto] items-start gap-x-4 gap-y-1 px-1 py-5 text-left md:grid-cols-[4rem_1fr_9rem_8rem_2rem] md:items-center md:gap-x-6 md:px-3"
      >
        <span className="font-mono text-xs text-silver md:text-sm">{String(i + 1).padStart(2, '0')}</span>
        <span className="min-w-0 break-words font-display text-xl font-bold leading-tight tracking-tight text-paper md:text-2xl">{a.title}</span>
        <span className={`hidden items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.12em] md:flex ${t.cls}`}><t.Icon className="h-3.5 w-3.5" strokeWidth={1.6} />{t.label}</span>
        <span className="meta col-start-2 md:col-start-auto">{when(a)}<span className={`ml-3 md:hidden ${t.cls}`}>{t.label}</span></span>
        <ArrowUpRight aria-hidden className={`row-span-2 hidden h-5 w-5 justify-self-end text-accent transition-transform duration-300 md:block ${open ? 'rotate-90' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} strokeWidth={1.5} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <p className="whitespace-pre-line break-words pb-6 pl-[3.2rem] pr-2 text-base leading-relaxed text-paper/80 md:pl-[5.5rem] md:pr-12">{a.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/**
 * Homepage bulletin. Shows every live announcement from the public GET /api/announcements
 * (polled every 20s by useAnnouncements) as ruled rows. Has loading, empty and error states.
 */
export default function AnnouncementsSection() {
  const { items, loading, error, reload } = useAnnouncements(20000)
  const hot = items.filter(isHot)

  return (
    <section id="announcements" aria-label="Announcements" className="relative px-5 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-7xl">
        <SectionHead index="06" label="Updates" title={<>Latest from<br />the organizers.</>}>
          Live updates from the organizers. New announcements appear here automatically.
        </SectionHead>

        {hot.length > 0 && (
          <div role="alert" className="mb-8 flex items-start gap-4 border-l-2 border-amber bg-amber/[0.06] px-5 py-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber" strokeWidth={1.6} />
            <div className="min-w-0">
              <p className="meta !text-amber">Important</p>
              <p className="mt-1 break-words font-semibold text-paper">{hot[0].title}</p>
              <p className="mt-0.5 line-clamp-3 whitespace-pre-line break-words text-sm text-paper/70">{hot[0].message}</p>
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <CardSkeletons count={4} />
        ) : items.length === 0 && error ? (
          <StateMessage tone="error" title="Couldn't load announcements" action={<MagneticButton onClick={reload} size="sm">Try again</MagneticButton>}>
            Something went wrong while fetching the latest updates. Please check your connection and try again.
          </StateMessage>
        ) : items.length === 0 ? (
          <StateMessage title="No announcements yet">Nothing has been announced right now. Check back soon, new updates will show up here.</StateMessage>
        ) : (
          <Reveal>
            <p className="meta mb-3 flex items-center gap-2"><span className="blink h-1.5 w-1.5 rounded-full bg-accent" />{items.length} live {items.length === 1 ? 'announcement' : 'announcements'}</p>
            <ul className="border-t border-white/10">{items.map((a, i) => <Row key={a._id} a={a} i={i} />)}</ul>
            {error && <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-widest text-amber">Couldn't refresh. Showing the last loaded announcements.</p>}
          </Reveal>
        )}
      </div>
    </section>
  )
}
