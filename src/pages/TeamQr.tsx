import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import PageHeader from '../components/PageHeader'
import MagneticButton from '../components/MagneticButton'
import { useAuth } from '../context/AuthContext'
import * as qrApi from '../api/qrApi'
import { ApiError } from '../lib/api'

export default function TeamQr() {
  const { team } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qr, setQr] = useState<qrApi.QrResponse | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    qrApi.getMyQr().then(setQr).catch((x) => setError(x instanceof ApiError ? x.message : 'Could not load QR code.'))
  }

  useEffect(load, [])

  useEffect(() => {
    if (qr?.qr.url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qr.qr.url, { width: 260, margin: 1, color: { dark: '#0A0B0A', light: '#F5FAFF' } }).catch(() => setError('Could not render QR code.'))
    }
  }, [qr])

  const isFirstYear = team?.teamYear === '1st Year'

  const download = () => {
    const src = canvasRef.current
    if (!src) return
    let href: string
    if (isFirstYear) {
      // Bake the "1st Year" label into the downloaded image, directly below the QR.
      const pad = 16, labelH = 36
      const out = document.createElement('canvas')
      out.width = src.width + pad * 2
      out.height = src.height + pad * 2 + labelH
      const ctx = out.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(src, pad, pad)
      ctx.fillStyle = '#0A0B0A'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('1st Year', out.width / 2, src.height + pad + labelH / 2 + 4)
      href = out.toDataURL('image/png')
    } else {
      href = src.toDataURL('image/png')
    }
    const link = document.createElement('a')
    link.download = `${team?.teamId ?? 'team'}-checkin-qr.png`
    link.href = href
    link.click()
  }

  if (!team) return null

  if (team.verificationStatus !== 'VERIFIED') {
    return (
      <>
        <PageHeader kicker="Check-in" title="Team QR" sub="Issued once your team is verified." />
        <section className="glass hud-corners relative p-8 text-center">
          <p className="text-sky-100/70">Your team status is <span className="text-amber-300">{team.verificationStatus}</span>. Your QR check-in code appears here once an admin verifies your team.</p>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader kicker="Check-in" title="Team QR" sub="Show this at the venue check-in desk." />
      <section className="glass hud-corners relative p-6 text-center md:p-10">
        {error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}
        {qr ? (
          <>
            <div className="mx-auto grid w-fit place-items-center rounded-2xl border border-cyan-400/20 bg-white p-4">
              <canvas ref={canvasRef} />
              {isFirstYear && <p className="mt-2 text-lg font-bold tracking-wide text-[#0A0B0A]">1st Year</p>}
            </div>
            <p className="mt-6 font-mono text-sm tracking-[0.3em] text-white">{team.teamId}</p>
            <p className={`mt-2 font-mono text-xs uppercase tracking-widest ${qr.checkedIn ? 'text-emerald-300' : 'text-cyan-300'}`}>
              {qr.checkedIn ? 'Checked in' : 'Not checked in'}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <MagneticButton onClick={download} variant="solid">Download QR</MagneticButton>
            </div>
            <p className="mt-4 text-xs text-slate-500">This QR is permanent for the event. If it's ever compromised, contact an event SUPER_ADMIN to have it reissued.</p>
          </>
        ) : !error ? (
          <p className="hud-label">Loading QR code…</p>
        ) : null}
      </section>
    </>
  )
}
