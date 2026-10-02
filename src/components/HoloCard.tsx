import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TiltCard from './TiltCard'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface Props {
  /** Small mono label, top-left (e.g. "ANN-01", a problem id). */
  code: string
  /** Badge content, top-right. */
  badge: ReactNode
  /** Tailwind border/text colour classes for the badge. */
  badgeClass?: string
  title: string
  text?: string
  /** Clamp the body text to a few lines until the card is opened. */
  clampText?: boolean
  /** Extra content revealed when the card is opened. */
  details?: ReactNode
  tags?: string[]
  /** Static line at the bottom of the card (e.g. a date). */
  footer?: ReactNode
  className?: string
}

/**
 * The "Event modules" (Tech Talks) 3D card, extracted as a reusable component: same TiltCard
 * (perspective, rotateX/Y spring tilt, mouse-follow glow, hover lift), same spark particles,
 * same header / title / body / tag / hint hierarchy and padding. Announcements and Problem
 * Statements render through this so they belong to the same card family.
 */
export default function HoloCard({ code, badge, badgeClass = 'border-cyan-400/30 text-cyan-300/70', title, text, clampText = false, details, tags, footer, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  // Touch screens have no hover tilt anyway (TiltCard ignores touch pointers); keep mouse tilt gentler on narrow screens.
  const narrow = useMediaQuery('(max-width: 767px)')
  const expandable = clampText || Boolean(details)

  return (
    <TiltCard
      className={`h-full overflow-hidden p-6 ${expandable ? 'cursor-pointer' : ''} ${className}`}
      max={narrow ? 5 : 12}
      onClick={expandable ? () => setOpen((o) => !o) : undefined}
    >
      {[12, 32, 55, 78, 90].map((l, k) => <span key={k} className="spark" style={{ left: `${l}%`, bottom: '18%', animationDelay: `${k * 0.25}s` }} />)}
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 font-mono text-[0.65rem] tracking-[0.25em] text-cyan-300/70">
          <span className="min-w-0 truncate">{code}</span>
          <span className={`shrink-0 rounded border px-2 py-0.5 ${badgeClass}`}>{badge}</span>
        </div>
        <h3 className="mt-8 break-words text-2xl font-bold tracking-wide text-white">{title}</h3>
        {text && (
          <p className={`mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-sky-100/65 ${clampText && !open ? 'line-clamp-4' : ''}`}>{text}</p>
        )}
        <AnimatePresence initial={false}>
          {open && details && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4 text-sm leading-relaxed text-cyan-100/80">
              {details}
            </motion.div>
          )}
        </AnimatePresence>
        {tags && tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((t) => <span key={t} className="max-w-full break-words rounded-full border border-cyan-400/25 bg-cyan-400/5 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-cyan-200">{t}</span>)}
          </div>
        )}
        <div className="mt-auto pt-5">
          {footer && <p className="font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">{footer}</p>}
          {expandable && <p className={`font-mono text-[0.62rem] uppercase tracking-[0.25em] text-cyan-300/60 ${footer ? 'mt-2' : ''}`}>{open ? 'Tap to collapse −' : 'Tap for details +'}</p>}
        </div>
      </div>
    </TiltCard>
  )
}
