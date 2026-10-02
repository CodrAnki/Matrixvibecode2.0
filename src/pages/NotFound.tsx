import MagneticButton from '../components/MagneticButton'
import { StaticBackdrop } from '../components/SceneBackdrop'

export default function NotFound() {
  return (
    <div className="relative grid min-h-[100svh] place-items-center px-6 text-center">
      <StaticBackdrop />
      <div className="relative">
        <p className="hud-label">Signal lost</p>
        <h1 className="display mt-4 text-[clamp(5rem,20vw,11rem)] text-glow">404</h1>
        <p className="mt-4 text-sky-100/70">This sector of the Matrix doesn’t exist.</p>
        <div className="mt-8"><MagneticButton to="/" variant="solid">Return home</MagneticButton></div>
      </div>
    </div>
  )
}
