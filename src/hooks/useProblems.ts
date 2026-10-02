import { useCallback, useEffect, useRef, useState } from 'react'
import * as problemApi from '../api/problemApi'
import type { ProblemStatement } from '../lib/types'

/** Loads the published problem statements from the existing GET /api/problems (see problemApi). */
export function useProblems() {
  const [items, setItems] = useState<ProblemStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const alive = useRef(true)

  const load = useCallback(() => {
    setLoading(true)
    problemApi.listProblems()
      .then((p) => { if (alive.current) { setItems(p); setError(false) } })
      .catch(() => { if (alive.current) setError(true) })
      .finally(() => { if (alive.current) setLoading(false) })
  }, [])

  useEffect(() => {
    alive.current = true
    load()
    return () => { alive.current = false }
  }, [load])

  return { items, loading, error, reload: load }
}
