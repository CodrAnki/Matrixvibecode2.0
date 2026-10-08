export const LOGO_SRC = `${import.meta.env.BASE_URL}matrix-logo.png`

export default function Logo({ className = 'h-10', showText = true, showImage = false, sub = 'VIBE CODING 2.0' }: { className?: string; showText?: boolean; showImage?: boolean; sub?: string }) {
  return (
    <span className="inline-flex items-center gap-3">
      {showImage && (
        <img
          src={LOGO_SRC}
          alt="MATRIX logo"
          className={`${className} w-auto object-contain`}
        />
      )}
      {showText && (
        <span className="leading-none">
          <span className="block text-sm font-bold tracking-[0.28em] text-white">
            MATRIX<span className="text-red-300">.JEC</span>
          </span>
          <span className="mt-1 block font-mono text-[0.6rem] tracking-[0.3em] text-red-300/80">{sub}</span>
        </span>
      )}
    </span>
  )
}
