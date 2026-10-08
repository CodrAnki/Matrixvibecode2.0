import { useEffect, useRef } from 'react'

const SEQUENCE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']

/** Classic Konami code listener. Ignores keystrokes while the user is typing in a form field, so it
 *  never fires while someone's filling in, say, their team name. */
export function useKonamiCode(onUnlock: () => void) {
  const pos = useRef(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return
      const key = e.key.toLowerCase()
      const expected = SEQUENCE[pos.current]
      if (key === expected) {
        pos.current += 1
        if (pos.current === SEQUENCE.length) {
          pos.current = 0
          onUnlock()
        }
      } else {
        pos.current = key === SEQUENCE[0] ? 1 : 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUnlock])
}
