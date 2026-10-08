import { useEffect, useRef, useState } from 'react'
import * as adminApi from '../../api/adminApi'
import type { Team } from '../../lib/types'
import { ApiError } from '../../lib/api'

/** Parses `.../checkin/MTX-10001?t=<token>` (or a bare "teamId|token" fallback) out of a scanned QR string. */
function parseQrPayload(raw: string): { teamId: string; token: string } | null {
  try {
    const url = new URL(raw)
    const teamId = url.pathname.split('/').filter(Boolean).pop()
    const token = url.searchParams.get('t')
    if (teamId && token) return { teamId, token }
  } catch { /* not a URL — try the fallback shape below */ }
  const [teamId, token] = raw.split('|')
  return teamId && token ? { teamId, token } : null
}

export default function AdminCheckins() {
  const [scanning, setScanning] = useState(false)
  const [manualId, setManualId] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [result, setResult] = useState<{ team: Team; alreadyCheckedIn: boolean } | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<{ team: { teamId: string; teamName: string }; checkedInAt: string }[]>([])
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)
  // Ref (not state) because the camera's decode callback can fire multiple times per second for the
  // same QR before a state update would flush — without this, one scan would hit the API dozens of times.
  const scanLockRef = useRef(false)

  const refreshLog = () => adminApi.listCheckIns({ limit: 50 }).then((r) => setLog((r.checkIns ?? []) as never)).catch(() => undefined)
  useEffect(() => { refreshLog() }, [])
  // Leaving the page must release the camera — otherwise the stream (and its decode loop) keeps running.
  useEffect(() => () => { scannerRef.current?.stop().catch(() => undefined) }, [])

  const handleScanValue = async (raw: string) => {
    if (scanLockRef.current) return
    const parsed = parseQrPayload(raw)
    if (!parsed) { setErr('Unrecognized QR format.'); return }
    scanLockRef.current = true
    await stopScanner() // one decode = one attempt; stop immediately so the same code can't be re-read mid-request
    await verify(parsed.teamId, parsed.token)
  }

  const startScanner = async () => {
    setErr(''); setResult(null); setScanning(true)
    scanLockRef.current = false
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const el = document.getElementById('qr-reader')
      if (!el) return
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decoded) => { handleScanValue(decoded) },
        () => undefined,
      )
    } catch {
      setErr('Camera unavailable — use manual entry below, or check browser camera permissions.')
      setScanning(false)
    }
  }

  const stopScanner = async () => {
    try { await scannerRef.current?.stop() } catch { /* already stopped */ }
    setScanning(false)
  }

  const verify = async (teamId: string, token: string) => {
    setBusy(true); setErr(''); setResult(null)
    try {
      const res = await adminApi.verifyQrScan(teamId, token)
      setResult(res)
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Invalid or expired QR code') }
    finally { setBusy(false) }
  }

  const confirm = async () => {
    if (!result) return
    setBusy(true); setErr('')
    try {
      await adminApi.confirmCheckIn(result.team.teamId)
      setResult({ ...result, alreadyCheckedIn: true })
      refreshLog()
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Could not confirm check-in') }
    finally { setBusy(false) }
  }

  return (
    <>
      <p className="hud-label mb-1">Event Day</p>
      <h1 className="mb-6 text-3xl font-bold text-white">Check-ins</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="admin-glass p-6">
          <p className="hud-label mb-4">Scanner</p>
          <div id="qr-reader" className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-red-400/20 bg-black/40" />
          <div className="mt-4 flex gap-2">
            {!scanning
              ? <button onClick={startScanner} className="flex-1 rounded-lg border border-red-400/30 px-3 py-2 font-mono text-xs uppercase text-red-300 hover:bg-red-400/10">Start Scanner</button>
              : <button onClick={stopScanner} className="flex-1 rounded-lg border border-rose-400/30 px-3 py-2 font-mono text-xs uppercase text-rose-300 hover:bg-rose-400/10">Stop Scanner</button>}
          </div>

          <p className="hud-label mb-3 mt-6">Manual lookup (fallback)</p>
          <div className="grid gap-2">
            <input className="field" placeholder="Team ID (e.g. MTX-10001)" value={manualId} onChange={(e) => setManualId(e.target.value)} />
            <input className="field" placeholder="Token (from QR URL ?t=...)" value={manualToken} onChange={(e) => setManualToken(e.target.value)} />
            <button disabled={busy || !manualId || !manualToken} onClick={() => verify(manualId.trim(), manualToken.trim())} className="rounded-lg border border-red-400/30 px-3 py-2 font-mono text-xs uppercase text-red-200 hover:bg-red-400/10 disabled:opacity-40">Verify</button>
          </div>
        </section>

        <section className="admin-glass p-6">
          <p className="hud-label mb-4">Scan result</p>
          {err && <p role="alert" className="mb-3 text-sm text-rose-300">{err}</p>}
          {!result && !err && <p className="text-sm text-slate-500">Scan a team QR or use manual lookup.</p>}
          {result && (
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-red-300">MATRIX Vibe Coding 2.0</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{result.team.teamName}</h2>
              <dl className="mt-4 grid gap-2 text-sm">
                {[['Team ID', result.team.teamId], ['College', result.team.college], ['Members', String((result.team.members ?? []).length + 1)], ['Verification', `✓ ${result.team.verificationStatus}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/5 pb-2"><dt className="text-slate-400">{k}</dt><dd className="text-white">{v}</dd></div>
                ))}
              </dl>
              {result.alreadyCheckedIn ? (
                <p className="mt-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-center font-mono text-sm uppercase tracking-widest text-amber-300">Team already checked in</p>
              ) : (
                <button disabled={busy} onClick={confirm} className="mt-5 w-full rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 font-mono text-sm uppercase tracking-widest text-red-300 hover:bg-red-400/20 disabled:opacity-40">Confirm Check-in</button>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="admin-glass mt-6 overflow-x-auto p-6">
        <p className="hud-label mb-4">Recent check-ins</p>
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead><tr className="border-b border-white/10 text-slate-400"><th className="py-2 font-mono text-[0.6rem] uppercase">Team</th><th className="py-2 font-mono text-[0.6rem] uppercase">Time</th></tr></thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={2} className="py-6 text-center text-slate-500">No check-ins yet.</td></tr>}
            {log.map((c, i) => (
              <tr key={i} className="border-b border-white/5"><td className="py-2 text-white">{c.team?.teamName ?? '—'} ({c.team?.teamId ?? '—'})</td><td className="py-2 text-slate-400">{new Date(c.checkedInAt).toLocaleTimeString()}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
