import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, Environment, Float, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { attachInput, input } from '../lib/input'
import { glowTexture, glyphTexture } from '../lib/textures'
import type { Tier } from '../lib/capabilities'

const damp = THREE.MathUtils.damp
const CYAN = '#C44552'

interface Cfg { dpr: number; particles: number; rain: number; code: number; cubes: number; panels: number; structures: number; env: boolean }
const CONFIG: Record<Exclude<Tier, 'none'>, Cfg> = {
  high: { dpr: 1.75, particles: 1400, rain: 26, code: 14, cubes: 10, panels: 4, structures: 12, env: true },
  medium: { dpr: 1.5, particles: 700, rain: 16, code: 9, cubes: 6, panels: 3, structures: 8, env: true },
  low: { dpr: 1.25, particles: 260, rain: 8, code: 5, cubes: 3, panels: 2, structures: 0, env: false },
}

function Rig({ variant }: { variant: 'hero' | 'auth' }) {
  const { camera } = useThree()
  useFrame((_, dt) => {
    const p = variant === 'hero' ? input.scroll : 0
    const tx = Math.sin(p * 2.6) * 3.4 + input.mx * 0.7
    const ty = 1.4 - p * 2.4 + input.my * 0.45
    const tz = 9.5 - p * 2.2
    camera.position.x = damp(camera.position.x, tx, 3, dt)
    camera.position.y = damp(camera.position.y, ty, 3, dt)
    camera.position.z = damp(camera.position.z, tz, 3, dt)
    camera.lookAt(0, 0.3 - p * 1.0, 0)
  })
  return null
}

// The MATRIX "M" mark, traced from public/matrix-logo.png (768px image coords) and extruded.
const M_PARTS: { pts: [number, number][]; accent?: boolean }[] = [
  { pts: [[148, 152], [615, 572], [615, 650], [148, 222]] },
  { pts: [[148, 252], [305, 383], [265, 417], [205, 360], [205, 470], [148, 515]] },
  { pts: [[620, 252], [620, 530], [567, 485], [567, 358], [492, 417], [455, 385]] },
  { pts: [[400, 322], [618, 152], [618, 225], [430, 362]], accent: true },
  { pts: [[148, 537], [320, 405], [355, 435], [148, 605]], accent: true },
]
const M_DEPTH = 0.42

function useMGeometries() {
  return useMemo(() => M_PARTS.map(({ pts, accent }) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2((x - 384) / 140, -(y - 400) / 140)))
    const geo = new THREE.ExtrudeGeometry(shape, { depth: M_DEPTH, bevelEnabled: false })
    geo.translate(0, 0, -M_DEPTH / 2)
    return { geo, accent }
  }), [])
}

function FloatingLogo() {
  const root = useRef<THREE.Group>(null)
  const mRef = useRef<THREE.Group>(null)
  const parts = useMGeometries()
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (mRef.current) { mRef.current.rotation.y = t * 0.25; mRef.current.rotation.z = Math.sin(t * 0.4) * 0.05 }
    if (root.current) root.current.position.y = 0.6 + Math.sin(t * 0.9) * 0.12
  })
  return (
    <group ref={root}>
      <group ref={mRef} scale={1.15}>
        {parts.map(({ geo, accent }, i) => (
          <mesh key={i} geometry={geo}>
            <meshStandardMaterial color={accent ? CYAN : '#171719'} metalness={0.9} roughness={0.28} />
            <Edges color={accent ? '#F4F4F5' : CYAN} threshold={15} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function ParticleSystem({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const palette = [new THREE.Color('#C44552'), new THREE.Color('#C44552'), new THREE.Color('#F4F4F5'), new THREE.Color('#F4F4F5')]
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 30
      p[i * 3 + 1] = (Math.random() - 0.4) * 16
      p[i * 3 + 2] = (Math.random() - 0.5) * 24
      const col = palette[Math.floor(Math.random() * palette.length)]
      c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b
    }
    return { positions: p, colors: c }
  }, [count])
  const map = useMemo(() => glowTexture(), [])
  useFrame((_, dt) => {
    const r = ref.current
    if (!r) return
    r.rotation.y += dt * 0.02
    r.position.x = damp(r.position.x, input.mx * 0.6, 2, dt)
    r.position.y = damp(r.position.y, input.my * 0.4 + input.scroll * 1.5, 2, dt)
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.09} map={map} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  )
}

const TRAIL = 8
function DigitalRain({ columns }: { columns: number }) {
  const n = columns * TRAIL
  const geo = useRef<THREE.BufferGeometry>(null)
  const data = useMemo(() => {
    const cx = new Float32Array(columns), cz = new Float32Array(columns), sp = new Float32Array(columns), head = new Float32Array(columns)
    for (let i = 0; i < columns; i++) {
      cx[i] = (Math.random() - 0.5) * 34
      cz[i] = -4 - Math.random() * 14
      sp[i] = 1.2 + Math.random() * 2.2
      head[i] = Math.random() * 18 - 6
    }
    const colors = new Float32Array(n * 3)
    for (let c = 0; c < columns; c++) for (let k = 0; k < TRAIL; k++) {
      const f = 1 - k / TRAIL
      const idx = (c * TRAIL + k) * 3
      colors[idx] = 0.13 * f; colors[idx + 1] = 0.9 * f; colors[idx + 2] = f
    }
    return { cx, cz, sp, head, colors, pos: new Float32Array(n * 3) }
  }, [columns, n])
  useFrame((_, dt) => {
    const d = data
    for (let c = 0; c < columns; c++) {
      d.head[c] -= d.sp[c] * dt
      if (d.head[c] < -6) d.head[c] = 12 + Math.random() * 4
      for (let k = 0; k < TRAIL; k++) {
        const i = (c * TRAIL + k) * 3
        d.pos[i] = d.cx[c]; d.pos[i + 1] = d.head[c] + k * 0.22; d.pos[i + 2] = d.cz[c]
      }
    }
    const a = geo.current?.getAttribute('position')
    if (a) a.needsUpdate = true
  })
  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" count={n} array={data.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={n} array={data.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.07} vertexColors transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

const GLYPHS = ['</>', '{ }', '01', 'AI', '=>', '#!', '[ ]', 'λ', '&&', '0xFF']
function CodeFragments({ count }: { count: number }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    let x = (Math.random() - 0.5) * 22
    if (Math.abs(x) < 3) x += x < 0 ? -3 : 3
    return { g: GLYPHS[i % GLYPHS.length], pos: [x, (Math.random() - 0.2) * 8, -1 - Math.random() * 9] as [number, number, number], s: 0.7 + Math.random() * 0.7, speed: 0.8 + Math.random() }
  }), [count])
  return (
    <>
      {items.map((it, i) => (
        <Float key={i} speed={it.speed} floatIntensity={1.5} rotationIntensity={0}>
          <sprite position={it.pos} scale={[it.s * 1.6, it.s * 0.8, 1]}>
            <spriteMaterial map={glyphTexture(it.g)} transparent opacity={0.65} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </Float>
      ))}
    </>
  )
}

function HoloPanel({ position, rotation = [0, 0, 0], w = 2.4, h = 1.5, color = CYAN, seed = 0 }: {
  position: [number, number, number]; rotation?: [number, number, number]; w?: number; h?: number; color?: string; seed?: number
}) {
  const bars = useMemo(() => Array.from({ length: 5 }, (_, i) => ({ y: h / 2 - 0.28 - (i * (h - 0.5)) / 5, bw: 0.4 + (((i * 37 + seed * 13) % 10) / 10) * (w - 0.9) })), [w, h, seed])
  return (
    <Float speed={1.4} floatIntensity={0.8} rotationIntensity={0.15}>
      <group position={position} rotation={rotation}>
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={color} transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          <Edges color={color} />
        </mesh>
        {bars.map((b, i) => (
          <mesh key={i} position={[-w / 2 + 0.2 + b.bw / 2, b.y, 0.01]}>
            <planeGeometry args={[b.bw, 0.05]} />
            <meshBasicMaterial color={color} transparent opacity={0.55} />
          </mesh>
        ))}
        <mesh position={[w / 2 - 0.45, -h / 2 + 0.5, 0.01]}>
          <ringGeometry args={[0.22, 0.26, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  )
}

function Cubes({ count }: { count: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    const r = 4 + Math.random() * 2.5
    return { pos: [Math.cos(a) * r, -1 + Math.random() * 4, Math.sin(a) * r - 2] as [number, number, number], s: 0.22 + Math.random() * 0.35, sp: 0.2 + Math.random() * 0.5 }
  }), [count])
  useFrame((_, dt) => {
    refs.current.forEach((m, i) => { if (m) { m.rotation.x += dt * items[i].sp; m.rotation.y += dt * items[i].sp * 0.7 } })
  })
  return (
    <>
      {items.map((it, i) => (
        <Float key={i} speed={1 + it.sp} floatIntensity={1.2} rotationIntensity={0}>
          <mesh ref={(el) => { refs.current[i] = el }} position={it.pos} scale={it.s}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#08121f" metalness={0.9} roughness={0.3} />
            <Edges color={i % 3 === 0 ? '#F4F4F5' : CYAN} />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function Structures({ count }: { count: number }) {
  // Skyline towers sit on an arc *behind* the logo only. On a full ring some landed on the camera's
  // side, and the scroll/mouse camera sway could push the lens up against one — a near-opaque tower
  // filling the screen as a black rectangle.
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = Math.PI * (1.12 + (0.76 * i) / Math.max(1, count - 1))
    const r = 15 + Math.random() * 5
    return { pos: [Math.cos(a) * r, -1 + Math.random() * 2, Math.sin(a) * r - 6] as [number, number, number], h: 4 + Math.random() * 9, w: 0.6 + Math.random() * 1.2 }
  }), [count])
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={[it.pos[0], it.pos[1] + it.h / 2 - 2, it.pos[2]]}>
          <boxGeometry args={[it.w, it.h, it.w]} />
          <meshBasicMaterial color="#111113" transparent opacity={0.85} />
          <Edges color="#3F1118" />
        </mesh>
      ))}
    </>
  )
}

function Lights() {
  const cyan = useRef<THREE.PointLight>(null)
  useFrame((_, dt) => {
    if (cyan.current) {
      cyan.current.position.x = damp(cyan.current.position.x, -4 + input.mx * 4, 3, dt)
      cyan.current.position.y = damp(cyan.current.position.y, 2 + input.my * 2, 3, dt)
    }
  })
  return (
    <>
      <ambientLight intensity={0.5} color="#F4F4F5" />
      <pointLight ref={cyan} position={[-4, 2, 3]} intensity={70} color={CYAN} />
      <pointLight position={[5, -1, 2]} intensity={45} color="#F4F4F5" />
      <pointLight position={[0, 4, -3]} intensity={30} color="#C44552" />
    </>
  )
}

function Stage({ variant, cfg }: { variant: 'hero' | 'auth'; cfg: Cfg }) {
  const g = useRef<THREE.Group>(null)
  const { size } = useThree()
  useFrame((_, dt) => {
    const o = g.current
    if (!o) return
    const wide = size.width / size.height > 1.2
    const p = variant === 'hero' ? input.scroll : 0
    const tx = variant === 'hero' && wide ? 2.7 * (1 - Math.min(1, p * 2.2)) : 0
    const ty = variant === 'hero' && !wide ? 0.6 : 0
    const ts = wide ? 1 : 0.72
    o.position.x = damp(o.position.x, tx, 2.5, dt)
    o.position.y = damp(o.position.y, ty, 2.5, dt)
    o.scale.setScalar(damp(o.scale.x, ts, 2.5, dt))
    o.rotation.y = damp(o.rotation.y, input.mx * 0.18 + p * 1.4, 2.5, dt)
  })
  return (
    <group ref={g}>
      <FloatingLogo />
      {cfg.panels > 0 && <HoloPanel position={[-3.6, 1.6, 0.4]} rotation={[0, 0.5, 0]} seed={1} />}
      {cfg.panels > 1 && <HoloPanel position={[3.5, 2.2, -0.5]} rotation={[0, -0.5, 0]} w={2} h={1.2} color="#F4F4F5" seed={2} />}
      {cfg.panels > 2 && <HoloPanel position={[3.9, -0.6, 1]} rotation={[0, -0.7, 0]} w={1.8} h={1.1} seed={3} />}
      {cfg.panels > 3 && <HoloPanel position={[-4, -0.9, -0.5]} rotation={[0, 0.7, 0]} w={2.1} h={1.2} color="#C44552" seed={4} />}
      <Cubes count={cfg.cubes} />
    </group>
  )
}

export default function MatrixScene({ tier, variant = 'hero' }: { tier: Exclude<Tier, 'none'>; variant?: 'hero' | 'auth' }) {
  const cfg = CONFIG[tier]
  useEffect(() => attachInput(), [])
  const rain = variant === 'auth' ? Math.ceil(cfg.rain / 2) : cfg.rain
  return (
    <Canvas
      dpr={[1, cfg.dpr]}
      camera={{ position: [0, 1.4, 9.5], fov: 45, near: 0.1, far: 80 }}
      gl={{ antialias: tier === 'high', alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#050506']} />
      <fog attach="fog" args={['#050506', 10, 32]} />
      {cfg.env && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={4} color="#F4F4F5" position={[-5, 2, -2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={3} color="#F4F4F5" position={[5, -1, -3]} scale={[8, 3, 1]} />
          <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 5, 2]} scale={4} />
        </Environment>
      )}
      <Lights />
      <Rig variant={variant} />
      <Stage variant={variant} cfg={cfg} />
      <gridHelper
        args={[70, 70, '#3A0B12', '#090909']}
        position={[0, -2.45, 0]}
        onUpdate={(o) => { const m = o.material as THREE.Material; m.transparent = true; m.opacity = 0.3 }}
      />
      <ParticleSystem count={variant === 'auth' ? Math.round(cfg.particles * 0.6) : cfg.particles} />
      <DigitalRain columns={rain} />
      <CodeFragments count={cfg.code} />
      {cfg.structures > 0 && <Structures count={cfg.structures} />}
    </Canvas>
  )
}
