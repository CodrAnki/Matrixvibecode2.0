import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import MagneticButton from '../components/MagneticButton'
import Logo from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import * as qrApi from '../api/qrApi'
import { ApiError } from '../lib/api'
import { IconCheck } from '../components/Icons'
import TeamStatusBanner from '../components/TeamStatusBanner'

const QR_COLOR = { dark: '#050506', light: '#F5FAFF' }

export default function TeamQr() {
  const { team } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qr, setQr] = useState<qrApi.QrResponse | null>(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const load = () => {
    setError('')
    qrApi.getMyQr().then(setQr).catch((x) => setError(x instanceof ApiError ? x.message : 'Could not load QR code.'))
  }

  useEffect(load, [])

  useEffect(() => {
    if (qr?.qr.url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, qr.qr.url, { width: 260, margin: 1, color: QR_COLOR }).catch(() => setError('Could not render QR code.'))
    }
  }, [qr])

  const isFirstYear = team?.teamYear === '1st Year'

  /**
   * The downloaded PNG is often the only copy that reaches the check-in desk (printed, or shown
   * from a gallery app with no internet) — so unlike the on-screen card, it needs to be fully
   * self-contained: event branding, the QR itself, and the team's name/ID baked into one image,
   * not just a bare QR code with nothing identifying it.
   */
  const download = async () => {
    const src = canvasRef.current
    if (!src || !team) return
    setDownloading(true)
    try {
      const w = src.width + 80
      const headerH = 96
      const footerH = isFirstYear ? 150 : 118
      const out = document.createElement('canvas')
      out.width = w
      out.height = headerH + src.height + 40 + footerH
      const ctx = out.getContext('2d')
      if (!ctx) return

      // Card background + a hairline border, so the badge reads as one object when printed.
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.strokeStyle = '#E4E4E7'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, out.width - 2, out.height - 2)

      // Header band: event branding, dark-on-light to match the site's palette.
      ctx.fillStyle = '#0B0B0C'
      ctx.fillRect(0, 0, out.width, headerH)
      ctx.fillStyle = '#F4F4F5'
      ctx.textAlign = 'center'
      ctx.font = '800 26px "Arial Black", Arial, sans-serif'
      ctx.fillText('MATRIX.JEC', w / 2, 40)
      ctx.fillStyle = '#F2A5AC'
      ctx.font = '600 13px monospace'
      ctx.fillText('V I B E   C O D I N G   2 . 0', w / 2, 68)

      // QR, centered under the header.
      const qrY = headerH + 20
      ctx.drawImage(src, (w - src.width) / 2, qrY)

      // Footer band: who this badge belongs to.
      let y = qrY + src.height + 38
      ctx.fillStyle = '#050506'
      ctx.font = '700 22px monospace'
      ctx.fillText(team.teamId, w / 2, y)
      y += 30
      ctx.fillStyle = '#3F3F46'
      ctx.font = '600 17px Arial, sans-serif'
      ctx.fillText(team.teamName, w / 2, y)

      if (isFirstYear) {
        y += 34
        const label = '1ST YEAR'
        ctx.font = '700 13px monospace'
        const tw = ctx.measureText(label).width
        const padX = 14, pillH = 26
        const pillW = tw + padX * 2
        const pillX = (w - pillW) / 2
        const pillY = y - pillH + 6
        ctx.fillStyle = '#FCE7E8'
        ctx.beginPath()
        // roundRect isn't in every TS lib target; draw the pill manually.
        const r = pillH / 2
        ctx.moveTo(pillX + r, pillY)
        ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + pillH, r)
        ctx.arcTo(pillX + pillW, pillY + pillH, pillX, pillY + pillH, r)
        ctx.arcTo(pillX, pillY + pillH, pillX, pillY, r)
        ctx.arcTo(pillX, pillY, pillX + pillW, pillY, r)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#C44552'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, w / 2, pillY + pillH / 2 + 1)
      }

      const link = document.createElement('a')
      link.download = `${team.teamId}-checkin-qr.png`
      link.href = out.toDataURL('image/png')
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  if (!team) return null

  // No usable QR: not verified yet, or disabled (the desk rejects a disabled team's QR, so showing
  // it would only send the team to the venue with a code that fails). The banner says why.
  if (team.verificationStatus !== 'VERIFIED' || team.disabled) {
    return (
      <>
        <PageHeader kicker="Check-in" title="Team QR" sub="Issued once your team is verified." />
        <TeamStatusBanner team={team} />
      </>
    )
  }

  return (
    <>
      <PageHeader kicker="Check-in" title="Team QR" sub="Show this at the venue check-in desk." />
      <section className="glass hud-corners relative mx-auto max-w-sm overflow-hidden p-0 text-center">
        {error && <p role="alert" className="m-4 text-sm text-rose-300">{error}</p>}
        {qr ? (
          <>
            {/* Badge header: the branding that was missing — this is an event pass, not a bare QR. */}
            <div className="border-b border-white/10 bg-gradient-to-b from-[#C44552]/15 to-transparent px-6 py-5">
              <Logo className="mx-auto h-10" showImage />
            </div>

            <div className="px-6 py-7">
              <div className="mx-auto grid w-fit place-items-center rounded-2xl border border-red-400/20 bg-white p-4 shadow-[0_0_60px_-10px_rgba(196,69,82,0.4)]">
                <canvas ref={canvasRef} />
              </div>

              <p className="mt-6 font-mono text-lg font-bold tracking-[0.25em] text-white">{team.teamId}</p>
              <p className="mt-1 text-sm text-slate-300">{team.teamName}</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {isFirstYear && (
                  <span className="rounded-full border border-red-400/40 bg-red-400/10 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-red-200">1st Year</span>
                )}
                <span className="flex items-center gap-1.5 rounded-full border border-red-400/30 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-widest text-red-300">
                  {qr.checkedIn ? <><IconCheck className="h-3.5 w-3.5" /> Checked in</> : 'Not checked in'}
                </span>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <MagneticButton onClick={download} variant="solid" disabled={downloading}>{downloading ? 'Preparing…' : 'Download QR'}</MagneticButton>
              </div>
              <p className="mt-4 text-xs text-slate-500">This QR stays valid through the event. If it's ever leaked or lost, <Link to="/dashboard/support" className="underline">contact support</Link> to have it reissued.</p>
            </div>
          </>
        ) : !error ? (
          <p className="hud-label p-8">Loading QR code…</p>
        ) : null}
      </section>
    </>
  )
}
