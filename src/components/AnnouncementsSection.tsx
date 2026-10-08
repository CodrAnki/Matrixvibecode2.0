import { motion } from 'framer-motion'
import { useAnnouncements } from '../hooks/useAnnouncements'
import type { Announcement } from '../lib/types'
import HoloCard from './HoloCard'
import Reveal from './Reveal'
import SectionTitle from './SectionTitle'
import { IconAlertCircle, IconClock, IconMegaphone, IconSettings } from './Icons'

const isHot = (a: Announcement) => a.priority === 'URGENT' || a.type === 'IMPORTANT'

const TYPE_STYLE: Record<Announcement['type'], { icon: typeof IconMegaphone; label: string; cls: string; accent: string }> = {
  GENERAL: { icon: IconMegaphone, label: 'General', cls: 'border-red-400/30 text-red-200', accent: '#f87171' },
  IMPORTANT: { icon: IconAlertCircle, label: 'Important', cls: 'border-rose-400/50 text-rose-300', accent: '#fb7185' },
  DEADLINE: { icon: IconClock, label: 'Deadline', cls: 'border-amber-400/40 text-amber-300', accent: '#fbbf24' },
  SYSTEM: { icon: IconSettings, label: 'System', cls: 'border-slate-400/30 text-slate-300', accent: '#94a3b8' },
}

const when = (a: Announcement) => new Date(a.publishedAt ?? a.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Homepage "Announcements" section. Shows EVERY live announcement returned by the public
 * GET /api/announcements (polled every 20s by useAnnouncements), as the same 3D cards used by the
 * other module sections. Has loading, empty and error states.
 */
export default function AnnouncementsSection() {
  const { items, error } = useAnnouncements(20000)
  const hot = items.filter(isHot)

  // Nothing published yet (or still loading, or a fetch failed with nothing cached): skip the whole
  // section rather than show an empty placeholder on a page people are scrolling through. It polls
  // in the background, so the section appears on its own the moment something goes live.
  if (items.length === 0) return null

  return (
    <section id="announcements" aria-label="Announcements" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle index="06" kicker="Announcements" title={<>Straight from <span className="hl-red">MATRIX.</span></>} sub="Live updates from the organizers. New announcements appear here automatically." />

        {hot.length > 0 && (
          <div role="alert" className="mb-8 overflow-hidden rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-1 h-10 w-[2px] shrink-0 rounded-full bg-rose-400" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.25em] text-rose-300">
                  <IconAlertCircle className="h-3 w-3" /> Important
                </p>
                <p className="mt-1 break-words font-semibold text-white">{hot[0].title}</p>
                <p className="mt-0.5 line-clamp-3 whitespace-pre-line break-words text-sm text-rose-100/80">{hot[0].message}</p>
              </div>
            </div>
          </div>
        )}

        <p className="hud-label mb-6">{items.length} live {items.length === 1 ? 'announcement' : 'announcements'}</p>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
          {items.map((a, i) => {
            const t = TYPE_STYLE[a.type] ?? TYPE_STYLE.GENERAL
            const TypeIcon = t.icon
            return (
              <Reveal key={a._id} delay={(i % 3) * 0.1} className="h-full">
                <HoloCard
                  code={`ANN-${String(i + 1).padStart(2, '0')}`}
                  badge={<span className="inline-flex items-center gap-1.5"><TypeIcon className="h-3 w-3" /> {t.label}</span>}
                  badgeClass={t.cls}
                  accent={t.accent}
                  title={a.title}
                  text={a.message}
                  clampText={a.message.length > 140 || a.message.split('\n').length > 3}
                  tags={a.priority !== 'NORMAL' ? [a.priority] : undefined}
                  footer={<span className="inline-flex items-center gap-1.5"><IconClock className="h-3 w-3 shrink-0" />{when(a)}</span>}
                  className={isHot(a) ? '!border-rose-400/40' : ''}
                />
              </Reveal>
            )
          })}
        </div>
        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center font-mono text-[0.65rem] uppercase tracking-widest text-amber-300/80">Couldn't refresh. Showing the last loaded announcements.</motion.p>}
      </div>
    </section>
  )
}
