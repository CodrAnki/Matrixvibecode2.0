import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useKonamiCode } from '../hooks/useKonamiCode'
import { useShakeDetect } from '../hooks/useShakeDetect'
import { onEasterEgg } from '../lib/easterEgg'

/**
 * Hidden developer credit. Four ways to find it, all landing on the same toast:
 *  - a styled message in the browser console (printed once on load)
 *  - tapping the navbar logo 5 times quickly (works on desktop and phones — the "easy" one)
 *  - shaking the phone (mobile only, where that's available)
 *  - the Konami code (↑↑↓↓←→←→BA), for anyone with a keyboard
 * None of this affects normal use of the site.
 */
export default function DevCredits() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    /* eslint-disable no-console */
    console.log('%cMATRIX VIBE CODING 2.0', 'color:#C44552;font-weight:bold;font-size:16px;font-family:monospace;padding:4px 0')
    console.log('%cBuilt by Garvit Dayal & Ankit Dubey — MATRIX club members.', 'color:#38B878;font-family:monospace;font-size:12px')
    console.log('%cPsst — there\'s an easter egg. Tap the logo 5 times fast, shake your phone, or try the Konami code: ↑ ↑ ↓ ↓ ← → ← → B A', 'color:#8B9691;font-family:monospace;font-size:11px')
    /* eslint-enable no-console */
  }, [])

  const unlock = useCallback(() => {
    setShow(true)
    const t = window.setTimeout(() => setShow(false), 6000)
    return () => window.clearTimeout(t)
  }, [])
  useKonamiCode(unlock)
  useShakeDetect(unlock)
  useEffect(() => onEasterEgg(unlock), [unlock])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          role="status"
          onClick={() => setShow(false)}
          className="fixed bottom-4 right-4 z-[70] max-w-[15rem] cursor-pointer rounded-[14px] border border-[#38B878]/40 bg-[#090909]/95 p-4 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.9),0_0_30px_-12px_rgba(56,184,120,0.3)]"
        >
          <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-[#38B878]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#38B878] shadow-[0_0_8px_#38B878]" />
            Easter egg found
          </p>
          <p className="mt-2 text-sm text-slate-100">
            Built by <span className="font-semibold text-white">Garvit Dayal</span> &amp;{' '}
            <span className="font-semibold text-white">Ankit Dubey</span>
          </p>
          <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-slate-500">MATRIX club members</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
