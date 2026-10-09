import { useEffect, useState, type FormEvent } from 'react'
import * as adminApi from '../../api/adminApi'
import MagneticButton from '../../components/MagneticButton'
import { ApiError } from '../../lib/api'
import { useAdminAuth } from '../AdminAuthContext'

export default function AdminSettings() {
  const { admin } = useAdminAuth()
  const canEdit = admin?.role === 'SUPER_ADMIN'

  const [settings, setSettings] = useState<Awaited<ReturnType<typeof adminApi.getSettings>> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    adminApi.getSettings().then(setSettings).catch((x) => setError(x instanceof ApiError ? x.message : 'Could not load settings.'))
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!settings) return
    setSaving(true); setError(''); setSaved(false)
    try {
      await adminApi.updateSettings({
        name: settings.name,
        maxTeamSize: settings.maxTeamSize,
        registrationOpen: settings.registrationOpen,
        checkInOpen: settings.checkInOpen,
      })
      setSaved(true)
    } catch (x) {
      setError(x instanceof ApiError ? x.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <p className="hud-label mb-1">Configuration</p>
      <h1 className="mb-6 text-3xl font-bold text-white">Settings</h1>

      {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
      {!settings && !error && <p className="text-sm text-slate-400">Loading…</p>}

      {settings && (
        <form onSubmit={save} className="admin-glass max-w-xl space-y-5 p-6">
          {!canEdit && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              Only a SUPER_ADMIN can change these — you're viewing them read-only.
            </p>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-red-200/70">Event name</label>
            <input disabled={!canEdit} className="field" value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.2em] text-red-200/70">Max team size</label>
            <input disabled={!canEdit} type="number" min={1} max={2} className="field" value={settings.maxTeamSize} onChange={(e) => setSettings({ ...settings, maxTeamSize: Number(e.target.value) })} />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
            <span className="text-sm text-slate-200">Registration open</span>
            <input disabled={!canEdit} type="checkbox" checked={settings.registrationOpen} onChange={(e) => setSettings({ ...settings, registrationOpen: e.target.checked })} className="h-5 w-5 accent-[#F4F4F5]" />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
            <span className="text-sm text-slate-200">Check-in open</span>
            <input disabled={!canEdit} type="checkbox" checked={settings.checkInOpen} onChange={(e) => setSettings({ ...settings, checkInOpen: e.target.checked })} className="h-5 w-5 accent-[#F4F4F5]" />
          </label>

          {canEdit && (
            <div className="flex items-center gap-3">
              <MagneticButton type="submit" variant="solid" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</MagneticButton>
              {saved && <span className="text-xs text-red-300">Saved.</span>}
            </div>
          )}
        </form>
      )}
    </>
  )
}
