import Reveal from './Reveal'

export default function SectionTitle({ kicker, title, sub, align = 'left' }: { kicker: string; title: string; sub?: string; align?: 'left' | 'center' }) {
  return (
    <Reveal className={`mb-12 max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      <p className="hud-label mb-4 flex items-center gap-3 [&>i]:h-px [&>i]:w-10 [&>i]:bg-red-400/70" style={align === 'center' ? { justifyContent: 'center' } : undefined}>
        <i />{kicker}
      </p>
      <h2 className="display text-[clamp(2.2rem,5.5vw,4.4rem)] text-grad">{title}</h2>
      {sub && <p className="mt-5 text-base text-slate-200/70 md:text-lg">{sub}</p>}
    </Reveal>
  )
}
