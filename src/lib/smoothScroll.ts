import Lenis from 'lenis'

let lenis: Lenis | null = null

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Starts Lenis (skipped entirely for prefers-reduced-motion). Returns a cleanup function. */
export function startSmoothScroll(): () => void {
  if (reduced()) return () => {}
  const l = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.9, anchors: false })
  lenis = l
  let raf = 0
  const loop = (time: number) => { l.raf(time); raf = requestAnimationFrame(loop) }
  raf = requestAnimationFrame(loop)
  return () => { cancelAnimationFrame(raf); l.destroy(); if (lenis === l) lenis = null }
}

/** Smoothly scrolls to an element or to the top, using Lenis when active and native smooth scrolling otherwise. */
export function scrollToTarget(target: Element | number, offset = -72) {
  if (lenis) { lenis.scrollTo(target as HTMLElement | number, { offset: typeof target === 'number' ? 0 : offset, duration: 1.3 }); return }
  const behavior: ScrollBehavior = reduced() ? 'auto' : 'smooth'
  if (typeof target === 'number') window.scrollTo({ top: target, behavior })
  else target.scrollIntoView({ behavior })
}
