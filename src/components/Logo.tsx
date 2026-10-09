export const LOGO_SRC = `${import.meta.env.BASE_URL}matrix-logo-red.png`
export const ORIGINAL_LOGO_SRC = `${import.meta.env.BASE_URL}matrix-logo.png`

export default function Logo({ className = 'h-10', showText = true, showImage = true, sub = 'VIBE CODING 2.0', imageSrc = LOGO_SRC }: { className?: string; showText?: boolean; showImage?: boolean; sub?: string; imageSrc?: string }) {
  return (
    <span className="inline-flex items-center gap-3">
      {showImage && (
        <img
          src={imageSrc}
          alt="MATRIX logo"
          className={`${className} w-auto object-contain`}
        />
      )}
      {showText && (
        <span className="leading-none">
          <span className="block text-sm font-bold tracking-[0.28em] text-[#C44552]">
            MATRIX<span className="text-[#C44552]">.JEC</span>
          </span>
          <span className="mt-1 block font-mono text-[0.6rem] tracking-[0.3em] text-[#E08B93]/80">{sub}</span>
        </span>
      )}
    </span>
  )
}
