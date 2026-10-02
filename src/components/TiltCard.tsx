import type * as React from 'react'
import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function TiltCard({ children, className = '', max = 9, onClick }: { children: ReactNode; className?: string; max?: number; onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 160, damping: 16 })
  const sry = useSpring(ry, { stiffness: 160, damping: 16 })
  const move = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    ry.set((px - 0.5) * max * 2)
    rx.set(-(py - 0.5) * max * 2)
    ref.current.style.setProperty('--mx', `${px * 100}%`)
    ref.current.style.setProperty('--my', `${py * 100}%`)
  }
  const leave = () => { rx.set(0); ry.set(0) }
  return (
    <motion.div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={onClick}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={`glass holo-card ${className}`}
    >
      {children}
    </motion.div>
  )
}
