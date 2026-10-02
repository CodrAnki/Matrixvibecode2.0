import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, Environment, Float, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { attachInput, input } from '../lib/input'
import { glowTexture, glyphTexture } from '../lib/textures'
import type { Tier } from '../lib/capabilities'

const damp = THREE.MathUtils.damp
const CYAN = '#00FF66'
const LOGO_URL = `${import.meta.env.BASE_URL}matrix-logo.png`

interface Cfg { dpr: number; particles: number; rain: number; code: number; cubes: number; panels: number; structures: number; env: boolean }
const CONFIG: Record<Exclude<Tier, 'none'>, Cfg> = {
  high: { dpr: 1.75, particles: 1400, rain: 26, code: 14, cubes: 10, panels: 4, structures: 12, env: true },
  medium: { dpr: 1.5, particles: 700, rain: 16, code: 9, cubes: 6, panels: 3, structures: 8, env: true },
  low: { dpr: 1.25, particles: 260, rain: 8, code: 5, cubes: 3, panels: 2, structures: 0, env: false },
}

/** Loads /matrix-logo.png (the real MATRIX.JEC logo). Silently skipped if the file is missing. */
function useLogoTexture() {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let dead = false
    new THREE.TextureLoader().load(
      LOGO_URL,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (!dead) setTex(t) },
      undefined,
      () => { /* logo not provided yet */ },
    )
    return () => { dead = true }
  }, [])
  return tex
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

function FloatingLogo({ logo }: { logo: THREE.Texture | null }) {
  const root = useRef<THREE.Group>(null)
  const xRef = useRef<THREE.Group>(null)
  const plane = useRef<THREE.Group>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (xRef.current) { xRef.current.rotation.y = t * 0.25; xRef.current.rotation.z = Math.sin(t * 0.4) * 0.05 }
    if (plane.current) { plane.current.rotation.y = Math.sin(t * 0.35) * 0.5 + input.mx * 0.25; plane.current.rotation.x = -input.my * 0.15 }
    if (root.current) root.current.position.y = 0.6 + Math.sin(t * 0.9) * 0.12
  })
  const aspect = logo && logo.image ? (logo.image as HTMLImageElement).width / (logo.image as HTMLImageElement).height : 1
  return (
    <group ref={root}>
      <group ref={xRef} scale={1.15}>
        {[Math.PI / 4, -Math.PI / 4].map((r, i) => (
          <mesh key={i} rotation={[0, 0, r]}>
            <boxGeometry args={[0.42, 4.2, 0.42]} />
            <meshStandardMaterial color="#0a1626" metalness={0.9} roughness={0.28} />
            <Edges color={CYAN} threshold={15} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.3, 0.03, 12, 128]} />
          <meshBasicMaterial color={CYAN} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.015, 8, 96]} />
          <meshBasicMaterial color="#00D9FF" />
        </mesh>
      </group>
      {logo && (
        <group ref={plane} position={[0, 0, 0.35]}>
          <mesh position={[0, 0, -0.05]} scale={[5, 5, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTexture()} color="#1ea7ff" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh>
            <planeGeometry args={[3.1, 3.1 / aspect]} />
            <meshBasicMaterial map={logo} transparent alphaTest={0.02} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  )
}

function Platform() {
  const pulse = useRef<THREE.Mesh>(null)
  const arcs = useRef<THREE.Group>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const k = (t * 0.35) % 1
    if (pulse.current) {
      pulse.current.scale.setScalar(0.5 + k * 1.6)
      ;(pulse.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.7
    }
    if (arcs.current) arcs.current.rotation.z = t * 0.2
  })
  return (
    <group position={[0, -2.3, 0]}>
      <mesh>
        <cylinderGeometry args={[3.3, 3.6, 0.18, 64]} />
        <meshStandardMaterial color="#050d1a" metalness={0.9} roughness={0.25} />
        <Edges color="#0A3D24" />
      </mesh>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <mesh><ringGeometry args={[2.6, 2.66, 96]} /><meshBasicMaterial color={CYAN} /></mesh>
        <mesh><ringGeometry args={[3.2, 3.23, 96]} /><meshBasicMaterial color="#00B84D" /></mesh>
        <group ref={arcs}>
          <mesh><ringGeometry args={[2.95, 3.03, 64, 1, 0, Math.PI * 1.2]} /><meshBasicMaterial color={CYAN} /></mesh>
          <mesh><ringGeometry args={[2.95, 3.03, 64, 1, Math.PI * 1.5, Math.PI * 0.4]} /><meshBasicMaterial color="#00D9FF" /></mesh>
        </group>
        <mesh ref={pulse}>
          <ringGeometry args={[3.0, 3.06, 96]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[12, 12, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTexture()} color="#0ea5e9" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function ParticleSystem({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const palette = [new THREE.Color('#00FF66'), new THREE.Color('#00B84D'), new THREE.Color('#00D9FF'), new THREE.Color('#e0f2fe')]
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
            <Edges color={i % 3 === 0 ? '#00D9FF' : CYAN} />
          </mesh>
        </Float>
      ))}
    </>
  )
}

function Structures({ count }: { count: number }) {
  const items = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    const r = 15 + Math.random() * 5
    return { pos: [Math.cos(a) * r, -1 + Math.random() * 2, Math.sin(a) * r - 6] as [number, number, number], h: 4 + Math.random() * 9, w: 0.6 + Math.random() * 1.2 }
  }), [count])
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={[it.pos[0], it.pos[1] + it.h / 2 - 2, it.pos[2]]}>
          <boxGeometry args={[it.w, it.h, it.w]} />
          <meshBasicMaterial color="#04101f" transparent opacity={0.85} />
          <Edges color="#0c4a6e" />
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
      <ambientLight intensity={0.5} color="#5b86b8" />
      <pointLight ref={cyan} position={[-4, 2, 3]} intensity={70} color={CYAN} />
      <pointLight position={[5, -1, 2]} intensity={45} color="#00D9FF" />
      <pointLight position={[0, 4, -3]} intensity={30} color="#00B84D" />
    </>
  )
}

function Stage({ variant, cfg, logo }: { variant: 'hero' | 'auth'; cfg: Cfg; logo: THREE.Texture | null }) {
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
      <FloatingLogo logo={logo} />
      <Platform />
      {cfg.panels > 0 && <HoloPanel position={[-3.6, 1.6, 0.4]} rotation={[0, 0.5, 0]} seed={1} />}
      {cfg.panels > 1 && <HoloPanel position={[3.5, 2.2, -0.5]} rotation={[0, -0.5, 0]} w={2} h={1.2} color="#00D9FF" seed={2} />}
      {cfg.panels > 2 && <HoloPanel position={[3.9, -0.6, 1]} rotation={[0, -0.7, 0]} w={1.8} h={1.1} seed={3} />}
      {cfg.panels > 3 && <HoloPanel position={[-4, -0.9, -0.5]} rotation={[0, 0.7, 0]} w={2.1} h={1.2} color="#00B84D" seed={4} />}
      <Cubes count={cfg.cubes} />
    </group>
  )
}

export default function MatrixScene({ tier, variant = 'hero' }: { tier: Exclude<Tier, 'none'>; variant?: 'hero' | 'auth' }) {
  const cfg = CONFIG[tier]
  const logo = useLogoTexture()
  useEffect(() => attachInput(), [])
  const rain = variant === 'auth' ? Math.ceil(cfg.rain / 2) : cfg.rain
  return (
    <Canvas
      dpr={[1, cfg.dpr]}
      camera={{ position: [0, 1.4, 9.5], fov: 45, near: 0.1, far: 80 }}
      gl={{ antialias: tier === 'high', alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#030504']} />
      <fog attach="fog" args={['#030504', 10, 32]} />
      {cfg.env && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={4} color="#00D9FF" position={[-5, 2, -2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={3} color="#00D9FF" position={[5, -1, -3]} scale={[8, 3, 1]} />
          <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 5, 2]} scale={4} />
        </Environment>
      )}
      <Lights />
      <Rig variant={variant} />
      <Stage variant={variant} cfg={cfg} logo={logo} />
      <gridHelper
        args={[70, 70, '#0A3D24', '#0A0D0C']}
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
