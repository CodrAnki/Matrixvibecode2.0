import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconChevronDown } from './Icons'

export interface SelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  id?: string
  disabled?: boolean
  invalid?: boolean
  /** Same contract as a native `<select className="field">` — pass `"field w-auto"` for an
   *  inline-sized control (e.g. a toolbar filter) instead of the default full-width form field. */
  className?: string
  'aria-label'?: string
}

/**
 * A `<select>` replacement styled to match the site instead of the browser's native dropdown.
 * Same controlled value/onChange contract as a native select, so swapping one in is a drop-in
 * change. Built as a button + listbox (combobox pattern): real focus stays on the trigger button
 * the whole time the list is open, and the highlighted row is tracked with aria-activedescendant,
 * so screen readers and keyboard nav behave like a real select without moving focus around.
 */
export default function Select({ value, onChange, options, id, disabled, invalid, className = 'field', 'aria-label': ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = id ? `${id}-listbox` : undefined
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    setActive(selectedIndex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const select = (i: number) => {
    const opt = options[i]
    if (!opt || opt.disabled) return
    onChange(opt.value)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(active) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && listId ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`${className} ${invalid ? 'invalid' : ''} select-trigger`}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <IconChevronDown aria-hidden className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.25} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="select-panel"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={listId ? `${listId}-${i}` : undefined}
                data-index={i}
                data-active={i === active}
                data-selected={o.value === value}
                role="option"
                aria-selected={o.value === value}
                aria-disabled={o.disabled}
                onMouseEnter={() => !o.disabled && setActive(i)}
                onClick={() => select(i)}
                className={`select-option ${o.disabled ? 'select-option-disabled' : ''}`}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#38B878]" />}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
