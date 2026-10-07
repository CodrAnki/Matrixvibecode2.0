import { useEffect } from 'react'
import { startSmoothScroll } from '../lib/smoothScroll'

/** Mounted only on the public home page; dashboards keep native scrolling so nested scroll areas behave. */
export default function SmoothScroll() {
  useEffect(() => startSmoothScroll(), [])
  return null
}
