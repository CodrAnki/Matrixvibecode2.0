import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as adminApi from '../../api/adminApi'
import type { Announcement, AnnouncementPriority, AnnouncementType } from '../../lib/types'
import { ApiError } from '../../lib/api'
import MagneticButton from '../../components/MagneticButton'
import Select from '../../components/Select'
import ConfirmButton from '../../components/ConfirmButton'

const TYPES: AnnouncementType[] = ['GENERAL', 'IMPORTANT', 'DEADLINE', 'SYSTEM']
const PRIORITIES: AnnouncementPriority[] = ['NORMAL', 'HIGH', 'URGENT']

// datetime-local needs local "YYYY-MM-DDTHH:mm"; the API stores/returns UTC ISO.
const toLocalInput = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const emptyForm = { title: '', message: '', type: 'GENERAL' as AnnouncementType, priority: 'NORMAL' as AnnouncementPriority, status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED', publishedAt: '', expiresAt: '' }
type FormState = typeof emptyForm

const STATUS_CLS: Record<string, string> = {
  PUBLISHED: 'border-red-400/30 text-red-300',
  DRAFT: 'border-white/15 text-slate-400',
  UNPUBLISHED: 'border-amber-400/30 text-amber-300',
}

export default function AdminAnnouncements() {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null)
  const [q, setQ] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fType, setFType] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const flash = (text: string, bad = false) => { setToast({ text, bad }); setTimeout(() => setToast(null), 3000) }

  const load = useCallback(() => {
    adminApi.listAnnouncementsAdmin({ q: q.trim(), status: fStatus, type: fType })
      .then((r) => setItems(r.announcements))
      .catch((x) => flash(x instanceof ApiError ? x.message : 'Could not load announcements.', true))
      .finally(() => setLoading(false))
  }, [q, fStatus, fType])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  // "+ Create Announcement" quick action from the dashboard lands here with ?new=1
  useEffect(() => {
    if (params.get('new')) { setParams({}, { replace: true }); formRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  }, [params, setParams])

  const resetForm = () => { setEditingId(null); setForm(emptyForm); setErr('') }
  const startEdit = (a: Announcement) => {
    setEditingId(a._id); setErr('')
    setForm({ title: a.title, message: a.message, type: a.type, priority: a.priority, status: a.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT', publishedAt: toLocalInput(a.publishedAt), expiresAt: toLocalInput(a.expiresAt) })
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (form.title.trim().length < 3) return setErr('Title must be at least 3 characters.')
    if (form.message.trim().length < 3) return setErr('Message must be at least 3 characters.')
    setErr(''); setBusy(true)
    const base = {
      title: form.title.trim(), message: form.message.trim(), type: form.type, priority: form.priority,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    }
    try {
      if (editingId) {
        const current = items.find((i) => i._id === editingId)
        // Editing never silently changes status except Draft → Published (UNPUBLISHED stays until Publish is clicked).
        const status = current?.status === 'UNPUBLISHED' && form.status === 'DRAFT' ? undefined : form.status
        await adminApi.updateAnnouncement(editingId, { ...base, ...(status && current?.status !== 'PUBLISHED' ? { status } : {}) })
        flash('Announcement updated.')
      } else {
        await adminApi.createAnnouncement({ ...base, status: form.status })
        flash(form.status === 'PUBLISHED' ? 'Announcement published.' : 'Announcement saved as draft.')
      }
      resetForm(); load()
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : 'Could not save announcement.')
    } finally {
      setBusy(false)
    }
  }

  const act = (fn: () => Promise<unknown>, ok: string) => fn().then(() => { flash(ok); load() }).catch((x) => flash(x instanceof ApiError ? x.message : 'Action failed.', true))
  const remove = (a: Announcement) => {
    if (editingId === a._id) resetForm()
    act(() => adminApi.deleteAnnouncement(a._id), 'Announcement deleted.')
  }

  const scheduled = (a: Announcement) => a.status === 'PUBLISHED' && a.publishedAt && new Date(a.publishedAt) > new Date()

  return (
    <>
      <p className="hud-label mb-1">Comms</p>
      <h1 className="mb-6 text-3xl font-bold text-white">Announcements</h1>
      {toast && <p role="status" className={`mb-4 rounded-lg border px-4 py-2 text-sm ${toast.bad ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-red-400/30 bg-red-500/10 text-red-200'}`}>{toast.text}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form ref={formRef} onSubmit={save} className="admin-glass grid h-fit gap-3 p-6">
          <p className="hud-label">{editingId ? 'Edit Announcement' : 'Create Announcement'}</p>
          <input className="field" placeholder="Title (e.g. Round 1 has started)" maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="field" rows={4} maxLength={2000} placeholder="Message / description" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">Type</label>
              <Select value={form.type} onChange={(v) => setForm({ ...form, type: v as AnnouncementType })} options={TYPES.map((t) => ({ value: t, label: t }))} />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">Priority</label>
              <Select value={form.priority} onChange={(v) => setForm({ ...form, priority: v as AnnouncementPriority })} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">Status</label>
            <Select
              disabled={editingId !== null && items.find((i) => i._id === editingId)?.status === 'PUBLISHED'}
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as 'DRAFT' | 'PUBLISHED' })}
              options={[
                { value: 'PUBLISHED', label: 'PUBLISHED (visible on public site)' },
                { value: 'DRAFT', label: 'DRAFT (hidden)' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">Publish at (optional)</label>
              <input type="datetime-local" className="field" value={form.publishedAt} onChange={(e) => setForm({ ...form, publishedAt: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">Expires at (optional)</label>
              <input type="datetime-local" className="field" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Leave “Publish at” empty to go live immediately. A future time schedules it.</p>
          {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
          <div className="flex gap-2">
            <MagneticButton type="submit" variant="solid" disabled={busy} className="flex-1 justify-center">
              {busy ? 'Saving…' : editingId ? 'Save changes' : form.status === 'PUBLISHED' ? 'Create & Publish' : 'Save as draft'}
            </MagneticButton>
            {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>}
          </div>
        </form>

        <div className="grid content-start gap-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input className="field" placeholder="Search title or message…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select
              aria-label="Filter by status"
              value={fStatus}
              onChange={setFStatus}
              options={[{ value: '', label: 'All statuses' }, { value: 'DRAFT', label: 'DRAFT' }, { value: 'PUBLISHED', label: 'PUBLISHED' }, { value: 'UNPUBLISHED', label: 'UNPUBLISHED' }]}
            />
            <Select
              aria-label="Filter by type"
              value={fType}
              onChange={setFType}
              options={[{ value: '', label: 'All types' }, ...TYPES.map((t) => ({ value: t, label: t }))]}
            />
          </div>
          {loading && <p className="text-sm text-slate-500">Loading…</p>}
          {!loading && items.length === 0 && <p className="text-sm text-slate-500">No announcements found.</p>}
          {items.map((a) => (
            <div key={a._id} className="admin-glass p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {a.priority !== 'NORMAL' && <span className={`rounded-full border px-2 py-0.5 font-mono text-[0.58rem] uppercase ${a.priority === 'URGENT' ? 'border-rose-400/40 bg-rose-500/10 text-rose-300' : 'border-amber-400/40 bg-amber-500/10 text-amber-300'}`}>{a.priority}</span>}
                  <p className="break-words font-semibold text-white">{a.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-red-400/30 px-2 py-0.5 font-mono text-[0.58rem] uppercase text-red-200">{a.type}</span>
                  <span className={`rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase ${STATUS_CLS[a.status]}`}>{scheduled(a) ? 'Scheduled' : a.status}</span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-100/60">{a.message}</p>
              <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-widest text-slate-500">
                Created {fmt(a.createdAt)} · Published {fmt(a.publishedAt)}{a.expiresAt && <> · Expires {fmt(a.expiresAt)}</>}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => startEdit(a)} className="rounded border border-white/15 px-2 py-1 font-mono text-[0.58rem] uppercase text-slate-300 hover:bg-white/5">Edit</button>
                {a.status === 'PUBLISHED'
                  ? <button onClick={() => act(() => adminApi.unpublishAnnouncement(a._id), 'Unpublished — removed from public site.')} className="rounded border border-amber-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-amber-300 hover:bg-amber-400/10">Unpublish</button>
                  : <button onClick={() => act(() => adminApi.publishAnnouncement(a._id), 'Published — live on the public site.')} className="rounded border border-red-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-red-300 hover:bg-red-400/10">Publish</button>}
                <ConfirmButton
                  message={`Delete "${a.title}"?`}
                  onConfirm={() => remove(a)}
                  className="rounded border border-rose-400/30 px-2 py-1 font-mono text-[0.58rem] uppercase text-rose-300 hover:bg-rose-400/10"
                >
                  Delete
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
