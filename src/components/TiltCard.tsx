import type * as React from 'react'
import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

type Props = {
  children: ReactNode
  className?: string
  max?: number
  onClick?: () => void
} & Pick<React.HTMLAttributes<HTMLDivElement>, 'role' | 'tabIndex' | 'onKeyDown' | 'aria-expanded'>

export default function TiltCard({ children, className = '', max = 9, onClick, ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 180, damping: 24 })
  const sry = useSpring(ry, { stiffness: 180, damping: 24 })
  const move = (e: React.PointerEvent) => {
    if (shouldReduceMotion || e.pointerType === 'touch' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const tilt = Math.min(max, 2)
    ry.set((px - 0.5) * tilt * 2)
    rx.set(-(py - 0.5) * tilt * 2)
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
      {...rest}
      whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      className={`glass holo-card ${className}`}
    >
      {children}
    </motion.div>
  )
}
