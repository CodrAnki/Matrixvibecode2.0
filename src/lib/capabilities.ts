export type Tier = 'high' | 'medium' | 'low' | 'none'

/** Decide how much 3D this device can handle. 'none' = static CSS backdrop. */
export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'none'
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'none'
  try {
    const c = document.createElement('canvas')
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'none'
  } catch {
    return 'none'
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency || 4
  const mem = nav.deviceMemory || 4
  if (cores <= 2 || mem <= 2) return 'low'
  if (window.innerWidth < 768) return 'low'
  if (window.innerWidth < 1100) return 'medium'
  return 'high'
}
