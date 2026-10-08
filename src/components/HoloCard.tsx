import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TiltCard from './TiltCard'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { IconChevronDown } from './Icons'

interface Props {
  /** Small mono label, top-left (e.g. "ANN-01", a problem id). */
  code: string
  /** Badge content, top-right. */
  badge: ReactNode
  /** Tailwind border/text colour classes for the badge. */
  badgeClass?: string
  /** CSS colour for a thin top edge, so a card's kind reads at a glance before the badge is read. */
  accent?: string
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
 * The "Event modules" 3D card, extracted as a reusable component: same TiltCard (subtle capped
 * rotateX/Y tilt, mouse-follow glow, restrained hover lift) and the same header / title / body /
 * tag / hint hierarchy and padding. Announcements and Problem Statements render through this so
 * they belong to the same card family.
 */
export default function HoloCard({ code, badge, badgeClass = 'border-red-400/30 text-red-300/70', accent, title, text, clampText = false, details, tags, footer, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  // Touch screens have no hover tilt anyway (TiltCard ignores touch pointers); keep mouse tilt gentler on narrow screens.
  const narrow = useMediaQuery('(max-width: 767px)')
  const expandable = clampText || Boolean(details)

  return (
    <TiltCard
      className={`group/card h-full overflow-hidden p-6 ${expandable ? 'cursor-pointer' : ''} ${className}`}
      max={narrow ? 5 : 12}
      onClick={expandable ? () => setOpen((o) => !o) : undefined}
      role={expandable ? 'button' : undefined}
      tabIndex={expandable ? 0 : undefined}
      aria-expanded={expandable ? open : undefined}
      onKeyDown={expandable ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setOpen((o) => !o) } } : undefined}
    >
      {accent && <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] opacity-70" style={{ background: accent }} />}
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 font-mono text-[0.62rem] tracking-[0.22em] text-red-300/70">
          <span className="min-w-0 truncate">{code}</span>
          <span className={`shrink-0 rounded border px-2 py-0.5 ${badgeClass}`}>{badge}</span>
        </div>
        <h3 className="display mt-8 break-words text-[1.6rem] leading-[1.05] text-[#F3F0E9]">{title}</h3>
        {text && (
          <p className={`mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-400 ${clampText && !open ? 'line-clamp-4' : ''}`}>{text}</p>
        )}
        <AnimatePresence initial={false}>
          {open && details && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4 text-sm leading-relaxed text-red-100/80">
              {details}
            </motion.div>
          )}
        </AnimatePresence>
        {tags && tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((t) => <span key={t} className="max-w-full break-words rounded-full border border-red-400/25 bg-red-400/5 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-widest text-red-200">{t}</span>)}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0">
            {footer && <div className="truncate font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">{footer}</div>}
          </div>
          {expandable && (
            <motion.span
              aria-hidden
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-slate-400 transition-colors group-hover/card:border-[#70D6A2]/40 group-hover/card:text-[#70D6A2]"
            >
              <IconChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
            </motion.span>
          )}
        </div>
      </div>
    </TiltCard>
  )
}
