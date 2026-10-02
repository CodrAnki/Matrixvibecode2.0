/** Prev / Next controls for server-paginated admin lists (styled like the existing admin buttons). */
export default function Pager({ page, pages, total, busy, onPage }: { page: number; pages: number; total: number; busy?: boolean; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  const btn = 'rounded-lg border border-white/15 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-slate-300 hover:bg-white/5 disabled:opacity-40'
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <span>Page {page} of {pages} · {total} total</span>
      <div className="flex gap-2">
        <button className={btn} disabled={busy || page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <button className={btn} disabled={busy || page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
    </nav>
  )
}
