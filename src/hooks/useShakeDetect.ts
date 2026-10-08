import { useEffect, useRef } from 'react'

const JOLT_THRESHOLD = 18 // combined axis delta (m/s^2) to count as one hard jolt
const JOLTS_NEEDED = 3
const WINDOW_MS = 1500

type MotionPermission = { requestPermission: () => Promise<'granted' | 'denied'> }

/**
 * The mobile-friendly easter egg trigger: shake the phone. iOS 13+ only grants motion access from
 * inside a user gesture, so permission is requested lazily on the first tap/touch anywhere on the
 * page rather than up front (which would just silently fail). No-ops on devices/browsers without
 * a motion sensor (most desktops), so it's safe to mount unconditionally.
 */
export function useShakeDetect(onShake: () => void) {
  const jolts = useRef(0)
  const last = useRef(0)
  const lastAccel = useRef({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.DeviceMotionEvent === 'undefined') return

    const handleMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null || a.y == null || a.z == null) return
      const delta = Math.abs(a.x - lastAccel.current.x) + Math.abs(a.y - lastAccel.current.y) + Math.abs(a.z - lastAccel.current.z)
      lastAccel.current = { x: a.x, y: a.y, z: a.z }
      if (delta < JOLT_THRESHOLD) return
      const now = Date.now()
      jolts.current = now - last.current > WINDOW_MS ? 1 : jolts.current + 1
      last.current = now
      if (jolts.current >= JOLTS_NEEDED) {
        jolts.current = 0
        onShake()
      }
    }

    let listening = false
    const start = () => {
      if (listening) return
      listening = true
      window.addEventListener('devicemotion', handleMotion)
    }

    const DM = window.DeviceMotionEvent as unknown as Partial<MotionPermission>
    let removeUnlock: (() => void) | undefined
    if (typeof DM.requestPermission === 'function') {
      const unlock = () => {
        DM.requestPermission!()
          .then((res) => { if (res === 'granted') start() })
          .catch(() => {})
      }
      window.addEventListener('touchend', unlock, { once: true })
      window.addEventListener('click', unlock, { once: true })
      removeUnlock = () => {
        window.removeEventListener('touchend', unlock)
        window.removeEventListener('click', unlock)
      }
    } else {
      start()
    }

    return () => {
      removeUnlock?.()
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [onShake])
}
