import type { InputHTMLAttributes, ReactNode } from 'react'

export default function Field({ label, error, hint, as = 'input', ...rest }: {
  label: string; error?: string; hint?: string; as?: 'input' | 'textarea'; children?: ReactNode
} & InputHTMLAttributes<HTMLInputElement> & { rows?: number }) {
  const id = 'f-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const cls = `field ${error ? 'invalid' : ''}`
  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-mono text-[0.66rem] uppercase tracking-[0.22em] text-red-200/80">{label}</label>
      {as === 'textarea'
        ? <textarea id={id} className={cls} {...(rest as object)} />
        : <input id={id} className={cls} {...rest} />}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-xs text-rose-300">{error}</p>}
    </div>
  )
}
