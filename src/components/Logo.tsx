import { useState } from 'react'

/** Official MATRIX.JEC logo: place the file at public/matrixLogo.png (transparent PNG recommended). */
export const LOGO_SRC = `${import.meta.env.BASE_URL}matrixLogo.png`

export default function Logo({ className = 'h-10', showText = true, sub = 'JEC' }: { className?: string; showText?: boolean; sub?: string }) {
  const [ok, setOk] = useState(true)
  return (
    <span className="inline-flex items-center gap-2.5">
      {ok && <img src={LOGO_SRC} alt="MATRIX JEC logo" className={`${className} w-auto object-contain`} onError={() => setOk(false)} />}
      {showText && (
        <span className="flex items-baseline gap-1.5 leading-none">
          <span className="display text-[1.15rem] tracking-[-0.02em] text-paper">MATRIX</span>
          <span className="hidden font-mono text-[0.62rem] tracking-[0.16em] text-silver min-[420px]:inline">/ {sub}</span>
        </span>
      )}
    </span>
  )
}
