import { useCallback, useRef } from 'react'

/**
 * Returns a click/tap handler: fires `onUnlock` once `count` taps land in quick succession
 * (within `windowMs` of each other). Identical for mouse clicks and touchscreen taps, so — unlike
 * a keyboard shortcut — it works on a phone. Meant to be the "easy to stumble onto" easter egg,
 * sitting on something people already click, like the logo.
 */
export function useTapTrigger(onUnlock: () => void, count = 5, windowMs = 1500) {
  const taps = useRef(0)
  const last = useRef(0)
  return useCallback(() => {
    const now = Date.now()
    taps.current = now - last.current > windowMs ? 1 : taps.current + 1
    last.current = now
    if (taps.current >= count) {
      taps.current = 0
      onUnlock()
    }
  }, [onUnlock, count, windowMs])
}
