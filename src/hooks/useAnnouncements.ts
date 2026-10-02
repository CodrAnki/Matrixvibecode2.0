import { useCallback, useEffect, useRef, useState } from 'react'
import * as announcementApi from '../api/announcementApi'
import type { Announcement } from '../lib/types'

/**
 * Lightweight live refresh: polls the public GET /api/announcements every `intervalMs`
 * (default 20s), pauses while the tab is hidden, and refetches the moment the tab is focused again.
 * No WebSockets needed — a newly published announcement shows up without a page reload.
 */
export function useAnnouncements(intervalMs = 20000) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const alive = useRef(true)

  const load = useCallback(() => {
    announcementApi.listAnnouncements()
      .then((a) => { if (alive.current) { setItems(a); setError(false) } })
      .catch(() => { if (alive.current) setError(true) })
      .finally(() => { if (alive.current) setLoading(false) })
  }, [])

  useEffect(() => {
    alive.current = true
    load()
    const tick = () => { if (document.visibilityState === 'visible') load() }
    const id = window.setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => { alive.current = false; window.clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [load, intervalMs])

  return { items, loading, error, reload: load }
}
