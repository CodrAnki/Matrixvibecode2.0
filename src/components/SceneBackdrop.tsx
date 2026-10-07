import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { detectTier, type Tier } from '../lib/capabilities'

const MatrixScene = lazy(() => import('../scenes/MatrixScene'))

/** Calm fallback (and the look of every non-hero page): flat ink with a faint grid. No glow. */
export function StaticBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      <div className="absolute inset-0 grid-bg opacity-70" />
    </div>
  )
}

class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e: unknown) { console.warn('3D scene disabled:', e) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/** The ONE WebGL scene on the site. Hero only; rendering pauses when the hero scrolls out of view. */
export default function HeroScene({ className = '' }: { className?: string }) {
  const [tier, setTier] = useState<Tier | null>(null)
  const [active, setActive] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => setTier(detectTier()), [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`pointer-events-none ${className}`} aria-hidden>
      {tier === null || tier === 'none' ? (
        <StaticBackdrop />
      ) : (
        <Boundary fallback={<StaticBackdrop />}>
          <Suspense fallback={<StaticBackdrop />}>
            <MatrixScene tier={tier} active={active} />
          </Suspense>
        </Boundary>
      )}
    </div>
  )
}
