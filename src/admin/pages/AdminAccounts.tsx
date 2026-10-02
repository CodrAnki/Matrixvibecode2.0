import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import * as adminApi from '../../api/adminApi'
import type { AdminAccount } from '../../api/adminApi'
import { ApiError } from '../../lib/api'
import MagneticButton from '../../components/MagneticButton'
import { useAdminAuth } from '../AdminAuthContext'

type Toast = { kind: 'ok' | 'err'; text: string } | null
const emptyForm = { name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'ADMIN' }

export default function AdminAccounts() {
  const { admin } = useAdminAuth()
  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null)
  const [superCreationEnabled, setSuperCreationEnabled] = useState(false)
  const [toast, setToast] = useState<Toast>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formErr, setFormErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminAccount | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: 'ADMIN', password: '', confirmPassword: '' })
  const [editErr, setEditErr] = useState('')
  const [statusTarget, setStatusTarget] = useState<AdminAccount | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null)
  const [busy, setBusy] = useState(false)

  const flash = (kind: 'ok' | 'err', text: string) => { setToast({ kind, text }); setTimeout(() => setToast(null), 3200) }
  const load = () => adminApi.listAdminAccounts()
    .then((r) => { setAccounts(r.accounts); setSuperCreationEnabled(r.superAdminCreationEnabled) })
    .catch((x) => flash('err', x instanceof ApiError ? x.message : 'Could not load admin accounts.'))
  useEffect(() => { void load() }, [])

  // Cosmetic guard only — every /api/admin/accounts call is re-checked server-side.
  if (admin && admin.role !== 'SUPER_ADMIN') return <Navigate to="/admin" replace />

  const roleOptions = superCreationEnabled ? ['ADMIN', 'SUPER_ADMIN'] : ['ADMIN']

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault()
    setFormErr('')
    if (form.password !== form.confirmPassword) { setFormErr('Password and confirmation do not match.'); return }
    setSaving(true)
    try {
      const r = await adminApi.createAdminAccount(form)
      flash('ok', r.message)
      setForm(emptyForm); setShowCreate(false)
      await load()
    } catch (x) {
      setFormErr(x instanceof ApiError ? x.message : 'Could not create the account.')
    } finally { setSaving(false) }
  }

  const openEdit = (a: AdminAccount) => { setEditTarget(a); setEditForm({ name: a.name, phone: a.phone, role: a.role, password: '', confirmPassword: '' }); setEditErr('') }
  const submitEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editTarget) return
    setEditErr('')
    if (editForm.password && editForm.password !== editForm.confirmPassword) { setEditErr('Password and confirmation do not match.'); return }
    const body: Parameters<typeof adminApi.updateAdminAccount>[1] = { name: editForm.name, phone: editForm.phone }
    if (editForm.role !== editTarget.role) body.role = editForm.role
    if (editForm.password) { body.password = editForm.password; body.confirmPassword = editForm.confirmPassword }
    setSaving(true)
    try {
      const r = await adminApi.updateAdminAccount(editTarget.id, body)
      flash('ok', r.message); setEditTarget(null); await load()
    } catch (x) {
      setEditErr(x instanceof ApiError ? x.message : 'Could not update the account.')
    } finally { setSaving(false) }
  }

  const confirmStatus = async () => {
    if (!statusTarget) return
    setBusy(true)
    try {
      const r = await adminApi.updateAdminAccount(statusTarget.id, { active: !statusTarget.active })
      flash('ok', statusTarget.active ? `${statusTarget.name} was deactivated.` : `${statusTarget.name} was reactivated.`)
      void r; setStatusTarget(null); await load()
    } catch (x) { flash('err', x instanceof ApiError ? x.message : 'Could not change account status.'); setStatusTarget(null) }
    finally { setBusy(false) }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const r = await adminApi.deleteAdminAccount(deleteTarget.id)
      flash('ok', r.message); setDeleteTarget(null); await load()
    } catch (x) { flash('err', x instanceof ApiError ? x.message : 'Could not delete the account.'); setDeleteTarget(null) }
    finally { setBusy(false) }
  }

  const btn = 'rounded border px-2 py-1 font-mono text-[0.58rem] uppercase disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="hud-label mb-1">Access Control</p><h1 className="text-3xl font-bold text-white">Admin Accounts</h1></div>
        <MagneticButton onClick={() => { setShowCreate(true); setFormErr('') }} variant="solid">+ Add Admin Account</MagneticButton>
      </div>

      {toast && <p role={toast.kind === 'ok' ? 'status' : 'alert'} className={`mb-4 rounded-lg border px-4 py-2 text-sm ${toast.kind === 'ok' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-rose-400/30 bg-rose-500/10 text-rose-200'}`}>{toast.text}</p>}

      <div className="admin-glass overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              {['Name', 'Email', 'Role', 'Status', 'Created At', 'Actions'].map((h) => <th key={h} className="px-4 py-3 font-mono text-[0.6rem] uppercase tracking-widest">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {accounts === null && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {accounts?.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No admin accounts.</td></tr>}
            {accounts?.map((a) => {
              const isSelf = a.id === admin?.id
              return (
                <tr key={a.id} className={`border-b border-white/5 ${a.active ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-3 text-white">{a.name}{isSelf && <span className="ml-2 font-mono text-[0.55rem] uppercase text-cyan-300">(you)</span>}</td>
                  <td className="px-4 py-3 text-slate-300">{a.email}</td>
                  <td className="px-4 py-3"><span className="rounded border border-cyan-400/30 px-2 py-0.5 font-mono text-[0.58rem] tracking-widest text-cyan-300">{a.role.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3"><span className={`rounded border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-widest ${a.active ? 'border-emerald-400/30 text-emerald-300' : 'border-white/15 text-slate-400'}`}>{a.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="px-4 py-3 text-slate-300">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => openEdit(a)} className={`${btn} border-white/15 text-slate-300 hover:bg-white/5`}>Edit</button>
                      <button disabled={isSelf && a.active} title={isSelf ? 'You cannot deactivate your own account' : undefined} onClick={() => setStatusTarget(a)} className={`${btn} border-amber-400/30 text-amber-300 hover:bg-amber-400/10`}>{a.active ? 'Deactivate' : 'Activate'}</button>
                      <button disabled={isSelf} title={isSelf ? 'You cannot delete your own account' : undefined} onClick={() => setDeleteTarget(a)} className={`${btn} border-rose-400/30 text-rose-300 hover:bg-rose-400/10`}>Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submitCreate} className="admin-glass grid w-full max-w-md gap-3 p-6">
            <p className="text-lg font-semibold text-white">Add Admin Account</p>
            <input required className="field" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required type="email" className="field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="field" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input required type="password" minLength={8} autoComplete="new-password" className="field" placeholder="Password (min 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input required type="password" minLength={8} autoComplete="new-password" className="field" placeholder="Confirm Password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
            <label className="grid gap-1 text-xs text-slate-400">Role
              <select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {roleOptions.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </label>
            {formErr && <p role="alert" className="text-sm text-rose-300">{formErr}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton type="submit" variant="solid" disabled={saving}>{saving ? 'Creating…' : 'Create'}</MagneticButton>
            </div>
          </form>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submitEdit} className="admin-glass grid w-full max-w-md gap-3 p-6">
            <p className="text-lg font-semibold text-white">Edit {editTarget.email}</p>
            <input required className="field" placeholder="Full Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            <input className="field" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            <label className="grid gap-1 text-xs text-slate-400">Role
              <select className="field" disabled={editTarget.id === admin?.id} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                {Array.from(new Set([editTarget.role, ...roleOptions])).map((r) => <option key={r} value={r} disabled={r === 'SUPER_ADMIN' && !superCreationEnabled && editTarget.role !== 'SUPER_ADMIN'}>{r.replace('_', ' ')}</option>)}
              </select>
            </label>
            <input type="password" autoComplete="new-password" className="field" placeholder="New password (leave blank to keep)" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            {editForm.password && <input type="password" autoComplete="new-password" className="field" placeholder="Confirm new password" value={editForm.confirmPassword} onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })} />}
            {editErr && <p role="alert" className="text-sm text-rose-300">{editErr}</p>}
            <div className="mt-2 flex justify-end gap-3">
              <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton type="submit" variant="solid" disabled={saving}>{saving ? 'Saving…' : 'Save'}</MagneticButton>
            </div>
          </form>
        </div>
      )}

      {statusTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-white">{statusTarget.active ? 'Deactivate' : 'Activate'} this account?</p>
            <p className="mt-2 text-sm text-slate-400">{statusTarget.active ? `${statusTarget.name} will no longer be able to sign in. You can reactivate them later.` : `${statusTarget.name} will be able to sign in again.`}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setStatusTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton onClick={confirmStatus} variant="solid" disabled={busy}>{statusTarget.active ? 'Deactivate' : 'Activate'}</MagneticButton>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="admin-glass w-full max-w-sm p-6 text-center">
            <p className="text-lg font-semibold text-white">Delete admin account?</p>
            <p className="mt-2 text-sm text-slate-400">{deleteTarget.name} ({deleteTarget.email}) will be permanently removed and can no longer sign in.</p>
            <div className="mt-5 flex justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
              <MagneticButton onClick={confirmDelete} variant="solid" disabled={busy}>Delete Account</MagneticButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
