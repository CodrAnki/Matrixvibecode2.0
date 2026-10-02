import { useState } from 'react'

/** Official MATRIX.JEC logo: place the file at public/matrix-logo.png (transparent PNG recommended). */
export const LOGO_SRC = `${import.meta.env.BASE_URL}matrix-logo.png`

export default function Logo({ className = 'h-10', showText = true, sub = 'VIBE CODING 2.0' }: { className?: string; showText?: boolean; sub?: string }) {
  const [ok, setOk] = useState(true)
  return (
    <span className="inline-flex items-center gap-3">
      {ok && (
        <img
          src={LOGO_SRC}
          alt="MATRIX.JEC"
          className={`${className} w-auto object-contain drop-shadow-[0_0_12px_rgba(0,255,102,0.55)]`}
          onError={() => setOk(false)}
        />
      )}
      {showText && (
        <span className="leading-none">
          <span className="block text-sm font-bold tracking-[0.28em] text-white">
            MATRIX{!ok && <span className="text-cyan-300">.JEC</span>}
          </span>
          <span className="mt-1 block font-mono text-[0.6rem] tracking-[0.3em] text-cyan-300/80">{sub}</span>
        </span>
      )}
    </span>
  )
}
