import { useCallback, useEffect, useRef, useState } from 'react'

/** Auto-clearing toast message whose timer is cancelled on unmount / replaced by the next message. */
export function useFlash(ms = 2800) {
  const [msg, setMsg] = useState('')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const flash = useCallback((m: string) => {
    window.clearTimeout(timer.current)
    setMsg(m)
    timer.current = window.setTimeout(() => setMsg(''), ms)
  }, [ms])
  return [msg, flash] as const
}
