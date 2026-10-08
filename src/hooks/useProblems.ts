import { useCallback, useEffect, useRef, useState } from 'react'
import * as problemApi from '../api/problemApi'
import { useEventPhase } from '../lib/eventPhase'
import type { ProblemStatement } from '../lib/types'

/**
 * Published problem statements, but only once they're visible to this browser: after the official
 * reveal, or under an admin's testing preview. Refetches the moment visibility changes (e.g. the
 * reveal lands mid-session), so pages update without a reload.
 */
export function useProblems() {
  const { problemsVisible, simulated, loaded, phase } = useEventPhase()
  const [items, setItems] = useState<ProblemStatement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // A preview was asked for but the server refused it: this browser isn't signed in as an admin.
  const [previewDenied, setPreviewDenied] = useState(false)
  const alive = useRef(true)

  const load = useCallback(() => {
    if (!problemsVisible) {
      setItems([])
      setError(false)
      setPreviewDenied(false)
      setLoading(!loaded)
      return
    }
    setLoading(true)
    problemApi.listProblems(simulated)
      .then((r) => {
        if (!alive.current) return
        setItems(r.problems)
        setPreviewDenied(simulated && !r.revealed && !r.preview)
        setError(false)
      })
      .catch(() => { if (alive.current) setError(true) })
      .finally(() => { if (alive.current) setLoading(false) })
  }, [problemsVisible, simulated, loaded])

  useEffect(() => {
    alive.current = true
    load()
    return () => { alive.current = false }
  }, [load])

  return { items, loading, error, reload: load, locked: !problemsVisible, previewDenied, phase }
}
