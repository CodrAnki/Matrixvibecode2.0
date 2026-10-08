import type * as React from 'react'
import { useRef, type ReactNode } from 'react'
import { Link, type To } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

interface Props {
  children: ReactNode
  to?: To
  href?: string
  onClick?: () => void
  variant?: 'solid' | 'ghost'
  size?: 'md' | 'sm'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  strength?: number
}

export default function MagneticButton({ children, to, href, onClick, variant = 'ghost', size = 'md', type = 'button', disabled, className = '', strength = 0.06 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.35 })
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.35 })
  const move = (e: React.PointerEvent) => {
    if (shouldReduceMotion || e.pointerType === 'touch' || disabled || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const maxOffset = 4
    x.set(Math.max(-maxOffset, Math.min(maxOffset, (e.clientX - (r.left + r.width / 2)) * strength)))
    y.set(Math.max(-maxOffset, Math.min(maxOffset, (e.clientY - (r.top + r.height / 2)) * strength)))
  }
  const leave = () => { x.set(0); y.set(0) }
  const cls = `btn ${variant === 'solid' ? 'btn-solid' : ''} ${size === 'sm' ? 'btn-sm' : ''} ${className}`
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy, display: 'inline-block' }} onPointerMove={move} onPointerLeave={leave}>
      {to !== undefined ? (
        <Link to={to} className={cls} onClick={onClick}>{children}</Link>
      ) : href ? (
        <a href={href} className={cls} target="_blank" rel="noreferrer">{children}</a>
      ) : (
        <button type={type} className={cls} onClick={onClick} disabled={disabled}>{children}</button>
      )}
    </motion.div>
  )
}
