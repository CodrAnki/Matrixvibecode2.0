import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  /** The resting trigger, e.g. a "Delete" button. Its own onClick is not needed — this component owns the click. */
  children: ReactNode
  className?: string
  disabled?: boolean
  /** What to ask before going ahead. */
  message: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  onConfirm: () => void
}

/**
 * Replaces `window.confirm` with an inline confirm step matching the rest of the admin panel's
 * confirm pattern (see AdminEventDay's reveal/hide toggle): click the trigger, it's replaced by the
 * question plus explicit Yes/Cancel buttons, no browser-native dialog involved.
 */
export default function ConfirmButton({ children, className, disabled, message, confirmLabel = 'Yes, delete', cancelLabel = 'Cancel', onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)

  // Both branches live inside one AnimatePresence, so toggling `confirming` actually plays an exit
  // transition — AnimatePresence only animates a child's removal if it stays mounted itself while
  // that child swaps out, which an early `if (!confirming) return …` above it would have defeated.
  return (
    <AnimatePresence initial={false} mode="wait">
      {!confirming ? (
        <motion.span key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
          <button type="button" disabled={disabled} onClick={() => setConfirming(true)} className={className}>
            {children}
          </button>
        </motion.span>
      ) : (
        <motion.span
          key="confirm"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="inline-flex flex-wrap items-center gap-2 rounded border border-rose-400/30 bg-rose-500/10 px-2 py-1"
        >
          <span className="font-mono text-[0.58rem] uppercase tracking-widest text-rose-200">{message}</span>
          <button type="button" disabled={disabled} onClick={() => { setConfirming(false); onConfirm() }} className="rounded border border-rose-400/40 px-2 py-0.5 font-mono text-[0.58rem] uppercase text-rose-200 hover:bg-rose-400/20">
            {confirmLabel}
          </button>
          <button type="button" disabled={disabled} onClick={() => setConfirming(false)} className="rounded border border-white/15 px-2 py-0.5 font-mono text-[0.58rem] uppercase text-slate-300 hover:bg-white/10">
            {cancelLabel}
          </button>
        </motion.span>
      )}
    </AnimatePresence>
  )
}
