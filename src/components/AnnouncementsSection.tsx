import { motion } from 'framer-motion'
import { useAnnouncements } from '../hooks/useAnnouncements'
import type { Announcement } from '../lib/types'
import HoloCard from './HoloCard'
import Reveal from './Reveal'
import SectionTitle from './SectionTitle'
import MagneticButton from './MagneticButton'
import { CardSkeletons, StateMessage } from './SectionStates'

const isHot = (a: Announcement) => a.priority === 'URGENT' || a.type === 'IMPORTANT'

const TYPE_STYLE: Record<Announcement['type'], { icon: string; label: string; cls: string }> = {
  GENERAL: { icon: '📢', label: 'General', cls: 'border-red-400/30 text-red-200' },
  IMPORTANT: { icon: '🔴', label: 'Important', cls: 'border-rose-400/50 text-rose-300' },
  DEADLINE: { icon: '⏰', label: 'Deadline', cls: 'border-amber-400/40 text-amber-300' },
  SYSTEM: { icon: '⚙️', label: 'System', cls: 'border-slate-400/30 text-slate-300' },
}

const when = (a: Announcement) => new Date(a.publishedAt ?? a.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Homepage "Announcements" section. Shows EVERY live announcement returned by the public
 * GET /api/announcements (polled every 20s by useAnnouncements), as the same 3D cards used by the
 * other module sections. Has loading, empty and error states.
 */
export default function AnnouncementsSection() {
  const { items, loading, error, reload } = useAnnouncements(20000)
  const hot = items.filter(isHot)

  return (
    <section id="announcements" aria-label="Announcements" className="relative px-5 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <SectionTitle kicker="Comms" title="Announcements" sub="Live updates from the organizers. New announcements appear here automatically." />

        {hot.length > 0 && (
          <div role="alert" className="mb-8 overflow-hidden rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
            <div className="flex items-start gap-3">
              <span className="blink mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_10px_#fb7185]" />
              <div className="min-w-0">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-rose-300">🔴 Important</p>
                <p className="mt-1 break-words font-semibold text-white">{hot[0].title}</p>
                <p className="mt-0.5 line-clamp-3 whitespace-pre-line break-words text-sm text-rose-100/80">{hot[0].message}</p>
              </div>
            </div>
          </div>
        )}

        {loading && items.length === 0 ? (
          <CardSkeletons />
        ) : items.length === 0 && error ? (
          <StateMessage tone="error" title="Couldn't load announcements" action={<MagneticButton onClick={reload} size="sm">Try again</MagneticButton>}>
            Something went wrong while fetching the latest updates. Please check your connection and try again.
          </StateMessage>
        ) : items.length === 0 ? (
          <StateMessage title="No announcements yet">Nothing has been announced right now. Check back soon, new updates will show up here.</StateMessage>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <span className="blink h-2 w-2 rounded-full bg-[#C44552] shadow-[0_0_10px_#C44552]" />
              <p className="hud-label">{items.length} live {items.length === 1 ? 'announcement' : 'announcements'}</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" style={{ perspective: 1200 }}>
              {items.map((a, i) => {
                const t = TYPE_STYLE[a.type] ?? TYPE_STYLE.GENERAL
                return (
                  <Reveal key={a._id} delay={(i % 3) * 0.1} className="h-full">
                    <HoloCard
                      code={`ANN-${String(i + 1).padStart(2, '0')}`}
                      badge={<>{t.icon} {t.label}</>}
                      badgeClass={t.cls}
                      title={a.title}
                      text={a.message}
                      clampText={a.message.length > 140 || a.message.split('\n').length > 3}
                      tags={a.priority !== 'NORMAL' ? [a.priority] : undefined}
                      footer={when(a)}
                      className={isHot(a) ? '!border-rose-400/40' : ''}
                    />
                  </Reveal>
                )
              })}
            </div>
            {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center font-mono text-[0.65rem] uppercase tracking-widest text-amber-300/80">Couldn't refresh. Showing the last loaded announcements.</motion.p>}
          </>
        )}
      </div>
    </section>
  )
}
