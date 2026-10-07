import { useEffect, useRef } from 'react'

/**
 * The one background system for everything after the hero: a survey-sheet grid, paper grain and
 * a dot field revealed around the pointer. CSS-only (no canvas / WebGL); updates two CSS variables
 * per animation frame at most. Static when the user prefers reduced motion or has no hover pointer.
 */
export default function SiteBackground() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let px = 0.5, py = 0.4
    const paint = () => {
      raf = 0
      el.style.setProperty('--px', `${px * 100}%`)
      el.style.setProperty('--py', `${py * 100}%`)
      el.style.setProperty('--bg-shift', `${-(window.scrollY * 0.06) % 160}px`)
    }
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint) }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      px = e.clientX / window.innerWidth
      py = e.clientY / window.innerHeight
      el.classList.add('site-bg--live')
      queue()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', queue, { passive: true })
    queue()
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('scroll', queue); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return (
    <div ref={ref} className="site-bg" aria-hidden>
      <div className="site-bg__grid" />
      <div className="site-bg__dots" />
      <div className="site-bg__grain" />
    </div>
  )
}
