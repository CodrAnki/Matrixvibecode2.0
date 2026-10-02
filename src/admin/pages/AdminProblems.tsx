import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as adminApi from '../../api/adminApi'
import type { ProblemStatement } from '../../lib/types'
import { ApiError } from '../../lib/api'
import MagneticButton from '../../components/MagneticButton'

type StatusFilter = 'ALL' | 'DRAFT' | 'PUBLISHED'
type DifficultyFilter = 'ALL' | ProblemStatement['difficulty']
type SortKey = 'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc'

const emptyForm = {
  title: '', shortDescription: '', description: '', category: '',
  difficulty: 'INTERMEDIATE' as ProblemStatement['difficulty'],
  constraints: '', inputFormat: '', outputFormat: '', sampleInput: '', sampleOutput: '', tags: '',
}
type FormState = typeof emptyForm

function toForm(p: ProblemStatement): FormState {
  return {
    title: p.title, shortDescription: p.shortDescription ?? '', description: p.description ?? '',
    category: p.category ?? '', difficulty: p.difficulty,
    constraints: p.constraints ?? '', inputFormat: p.inputFormat ?? '', outputFormat: p.outputFormat ?? '',
    sampleInput: p.sampleInput ?? '', sampleOutput: p.sampleOutput ?? '', tags: (p.tags ?? []).join(', '),
  }
}

function toPayload(f: FormState) {
  return {
    title: f.title.trim(),
    shortDescription: f.shortDescription.trim() || undefined,
    description: f.description.trim() || undefined,
    category: f.category.trim() || undefined,
    difficulty: f.difficulty,
    constraints: f.constraints.trim() || undefined,
    inputFormat: f.inputFormat.trim() || undefined,
    outputFormat: f.outputFormat.trim() || undefined,
    sampleInput: f.sampleInput.trim() || undefined,
    sampleOutput: f.sampleOutput.trim() || undefined,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
  }
}

export default function AdminProblems() {
  const [problems, setProblems] = useState<ProblemStatement[] | null>(null)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('created_desc')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ProblemStatement | null>(null)
  const [deleting, setDeleting] = useState(false)

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2800) }

  const load = () => {
    setLoadError('')
    adminApi.listProblemsAdmin().then((r) => setProblems(r.problems)).catch((x) => setLoadError(x instanceof ApiError ? x.message : 'Could not load problem statements.'))
  }
  useEffect(load, [])

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormErr(''); setFormOpen(true) }
  const openEdit = (p: ProblemStatement) => { setEditingId(p._id); setForm(toForm(p)); setFormErr(''); setFormOpen(true) }
  const closeForm = () => setFormOpen(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (form.title.trim().length < 3) return setFormErr('Title is required (min 3 characters).')
    setSaving(true); setFormErr('')
    try {
      if (editingId) {
        await adminApi.updateProblem(editingId, toPayload(form))
        flash('Problem statement updated.')
      } else {
        await adminApi.createProblem(toPayload(form))
        flash('Problem statement saved as draft.')
      }
      setFormOpen(false)
      load()
    } catch (x) {
      setFormErr(x instanceof ApiError ? x.message : 'Could not save problem statement.')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (p: ProblemStatement) => {
    try {
      if (p.isPublished) { await adminApi.unpublishProblem(p._id); flash(`"${p.title}" moved back to Draft.`) }
      else { await adminApi.publishProblem(p._id); flash(`"${p.title}" published — teams can now see it.`) }
      load()
    } catch (x) {
      flash(x instanceof ApiError ? x.message : 'Could not update publish status.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await adminApi.deleteProblem(deleteTarget._id)
      flash(`"${deleteTarget.title}" deleted.`)
      setDeleteTarget(null)
      load()
    } catch (x) {
      flash(x instanceof ApiError ? x.message : 'Could not delete problem statement.')
    } finally {
      setDeleting(false)
    }
  }

  const visible = useMemo(() => {
    if (!problems) return []
    let list = problems
    if (statusFilter !== 'ALL') list = list.filter((p) => (statusFilter === 'PUBLISHED' ? p.isPublished : !p.isPublished))
    if (difficultyFilter !== 'ALL') list = list.filter((p) => p.difficulty === difficultyFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.problemId.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      const field = sortKey.startsWith('created') ? 'createdAt' : 'updatedAt'
      const dir = sortKey.endsWith('desc') ? -1 : 1
      return dir * (new Date(a[field] ?? 0).getTime() - new Date(b[field] ?? 0).getTime())
    })
    return sorted
  }, [problems, statusFilter, difficultyFilter, search, sortKey])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="hud-label mb-1">Challenges</p>
          <h1 className="text-3xl font-bold text-white">Problem Statements</h1>
          <p className="mt-1 text-sm text-slate-400">Optional — the event runs fine with zero problem statements. Add them whenever they're ready.</p>
        </div>
        <MagneticButton onClick={openCreate} variant="solid">+ Add Problem Statement</MagneticButton>
      </div>

      {toast && <p role="status" className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{toast}</p>}
      {loadError && <p role="alert" className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">{loadError}</p>}

      {problems === null && !loadError && <p className="text-sm text-slate-400">Loading…</p>}

      {problems !== null && problems.length === 0 && (
        <div className="admin-glass p-10 text-center">
          <p className="text-slate-300">No problem statements added yet.</p>
          <div className="mt-4 flex justify-center">
            <MagneticButton onClick={openCreate} variant="solid">+ Add Problem Statement</MagneticButton>
          </div>
        </div>
      )}

      {problems !== null && problems.length > 0 && (
        <>
          <div className="admin-glass mb-5 flex flex-wrap items-center gap-3 p-4">
            <input className="field flex-1 min-w-[180px]" placeholder="Search title, ID, or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="field w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
            <select className="field w-auto" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}>
              <option value="ALL">All difficulties</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
            <select className="field w-auto" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="created_desc">Newest created</option>
              <option value="created_asc">Oldest created</option>
              <option value="updated_desc">Recently updated</option>
              <option value="updated_asc">Least recently updated</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-slate-500">No problem statements match these filters.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {visible.map((p) => (
                <div key={p._id} className="admin-glass p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[0.6rem] uppercase tracking-widest text-cyan-300">{p.problemId}</p>
                      <p className="text-lg font-semibold text-white">{p.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{p.category || 'Uncategorized'} · {p.difficulty}</p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase ${p.isPublished ? 'border-emerald-400/30 text-emerald-300' : 'border-white/15 text-slate-400'}`}>
                      {p.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {p.shortDescription && <p className="mt-2 text-sm text-sky-100/60">{p.shortDescription}</p>}
                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => <span key={t} className="rounded-full border border-white/10 px-2 py-0.5 text-[0.62rem] text-slate-400">{t}</span>)}
                    </div>
                  )}
                  <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">
                    Created {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'} · Updated {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => openEdit(p)} className="rounded border border-white/15 px-2 py-1 font-mono text-[0.58rem] uppercase text-slate-300 hover:bg-white/5">View / Edit</button>
                    <button onClick={() => togglePublish(p)} className="rounded border border-cyan-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-cyan-300 hover:bg-cyan-400/10">
                      {p.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="rounded border border-rose-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-rose-300 hover:bg-rose-400/10">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <form onSubmit={save} className="admin-glass max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">{editingId ? 'Edit problem statement' : 'New problem statement'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input required className="field sm:col-span-2" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className="field sm:col-span-2" placeholder="Short description (shown in listings)" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              <textarea className="field sm:col-span-2" rows={4} placeholder="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="field" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <select className="field" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as ProblemStatement['difficulty'] })}>
                <option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option>
              </select>
              <textarea className="field sm:col-span-2" rows={2} placeholder="Constraints" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />
              <textarea className="field" rows={2} placeholder="Input format" value={form.inputFormat} onChange={(e) => setForm({ ...form, inputFormat: e.target.value })} />
              <textarea className="field" rows={2} placeholder="Output format" value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })} />
              <textarea className="field" rows={2} placeholder="Sample input" value={form.sampleInput} onChange={(e) => setForm({ ...form, sampleInput: e.target.value })} />
              <textarea className="field" rows={2} placeholder="Sample output" value={form.sampleOutput} onChange={(e) => setForm({ ...form, sampleOutput: e.target.value })} />
              <input className="field sm:col-span-2" placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            {formErr && <p role="alert" className="mt-3 text-sm text-rose-300">{formErr}</p>}
            <p className="mt-3 text-xs text-slate-500">
              {editingId ? 'Publish status is managed from the card\'s Publish/Unpublish button.' : 'Saved as a Draft — publish it from the card once you\'re ready for teams to see it.'}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton type="submit" variant="solid" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save as draft'}</MagneticButton>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-white">Delete this problem statement?</p>
            <p className="mt-2 text-sm text-slate-400">Are you sure you want to delete "{deleteTarget.title}"? This can't be undone from the UI, though teams that already selected it keep their reference.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
