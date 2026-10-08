import { useId } from 'react'

export default function Trophy({ tone = '#C44552', className = '' }: { tone?: string; className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 120 140" className={className} style={{ filter: `drop-shadow(0 0 16px ${tone}88)` }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor={tone} />
          <stop offset="1" stopColor="#111113" />
        </linearGradient>
      </defs>
      <path d="M30 10H90V50C90 75 75 90 60 90C45 90 30 75 30 50Z" fill={`url(#${id})`} stroke={tone} strokeWidth="1.5" />
      <path d="M30 20H12C12 45 22 55 34 58M90 20H108C108 45 98 55 86 58" fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" />
      <rect x="54" y="90" width="12" height="22" fill={`url(#${id})`} />
      <rect x="36" y="112" width="48" height="10" rx="3" fill={`url(#${id})`} stroke={tone} strokeWidth="1" />
      <rect x="28" y="122" width="64" height="10" rx="3" fill="#111113" stroke={tone} strokeWidth="1.5" />
      <path d="M60 28l6 12 13 2-9.5 9 2.5 13-12-6.5-12 6.5 2.5-13-9.5-9 13-2z" fill="#050506" fillOpacity="0.45" />
    </svg>
  )
}
