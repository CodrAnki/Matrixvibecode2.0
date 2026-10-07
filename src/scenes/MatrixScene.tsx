import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Edges, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { attachInput, input } from '../lib/input'
import { glowTexture } from '../lib/textures'
import type { Tier } from '../lib/capabilities'

const damp = THREE.MathUtils.damp
const CYAN = '#35E884'
const LOGO_URL = `${import.meta.env.BASE_URL}matrixLogo.png`

interface Cfg { dpr: number; particles: number; env: boolean }
const CONFIG: Record<Exclude<Tier, 'none'>, Cfg> = {
  high: { dpr: 1.75, particles: 380, env: true },
  medium: { dpr: 1.5, particles: 220, env: true },
  low: { dpr: 1.25, particles: 90, env: false },
}

/** Loads /matrixLogo.png (the real MATRIX.JEC logo). Silently skipped if the file is missing. */
function useLogoTexture() {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    let dead = false
    new THREE.TextureLoader().load(
      LOGO_URL,
      (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; if (!dead) setTex(t) },
      undefined,
      () => { /* logo not provided yet */ },
    )
    return () => { dead = true }
  }, [])
  return tex
}

function Rig() {
  const { camera } = useThree()
  useFrame((_, dt) => {
    const p = 0
    const tx = input.mx * 0.7
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
            <meshStandardMaterial color="#121412" metalness={0.9} roughness={0.28} />
            <Edges color={CYAN} threshold={15} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.3, 0.03, 12, 128]} />
          <meshBasicMaterial color={CYAN} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.015, 8, 96]} />
          <meshBasicMaterial color="#B9BCB3" />
        </mesh>
      </group>
      {logo && (
        <group ref={plane} position={[0, 0, 0.35]}>
          <mesh position={[0, 0, -0.05]} scale={[3.6, 3.6, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTexture()} color="#35E884" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh>
            <planeGeometry args={[1.9, 1.9 / aspect]} />
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
        <meshStandardMaterial color="#0d0f0d" metalness={0.9} roughness={0.25} />
        <Edges color="#1B3A2A" />
      </mesh>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <mesh><ringGeometry args={[2.6, 2.66, 96]} /><meshBasicMaterial color={CYAN} /></mesh>
        <mesh><ringGeometry args={[3.2, 3.23, 96]} /><meshBasicMaterial color="#2BB868" /></mesh>
        <group ref={arcs}>
          <mesh><ringGeometry args={[2.95, 3.03, 64, 1, 0, Math.PI * 1.2]} /><meshBasicMaterial color={CYAN} /></mesh>
          <mesh><ringGeometry args={[2.95, 3.03, 64, 1, Math.PI * 1.5, Math.PI * 0.4]} /><meshBasicMaterial color="#B9BCB3" /></mesh>
        </group>
        <mesh ref={pulse}>
          <ringGeometry args={[3.0, 3.06, 96]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.6} depthWrite={false} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} scale={[12, 12, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTexture()} color="#35E884" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function ParticleSystem({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const palette = [new THREE.Color('#35E884'), new THREE.Color('#B9BCB3'), new THREE.Color('#ECE8DF'), new THREE.Color('#ECE8DF')]
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
    r.position.y = damp(r.position.y, input.my * 0.4, 2, dt)
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.06} map={map} vertexColors transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
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
      <ambientLight intensity={0.5} color="#9aa39c" />
      <pointLight ref={cyan} position={[-4, 2, 3]} intensity={70} color={CYAN} />
      <pointLight position={[5, -1, 2]} intensity={45} color="#B9BCB3" />
      <pointLight position={[0, 4, -3]} intensity={30} color="#2BB868" />
    </>
  )
}

function Stage({ logo }: { cfg: Cfg; logo: THREE.Texture | null }) {
  const g = useRef<THREE.Group>(null)
  const { size } = useThree()
  useFrame((_, dt) => {
    const o = g.current
    if (!o) return
    const wide = size.width / size.height > 1.2
    const p = 0
    const tx = wide ? 4.1 : 0
    const ty = !wide ? 0.6 : 0
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
    </group>
  )
}

export default function MatrixScene({ tier, active = true }: { tier: Exclude<Tier, 'none'>; active?: boolean }) {
  const cfg = CONFIG[tier]
  const logo = useLogoTexture()
  useEffect(() => attachInput(), [])
  return (
    <Canvas
      dpr={[1, cfg.dpr]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 1.4, 9.5], fov: 45, near: 0.1, far: 80 }}
      gl={{ antialias: tier === 'high', alpha: false, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#0A0B0A']} />
      <fog attach="fog" args={['#0A0B0A', 10, 30]} />
      {cfg.env && (
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={3} color="#ECE8DF" position={[-5, 2, -2]} scale={[8, 3, 1]} />
          <Lightformer form="rect" intensity={2} color="#35E884" position={[5, -1, -3]} scale={[8, 3, 1]} />
          <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 5, 2]} scale={4} />
        </Environment>
      )}
      <Lights />
      <Rig />
      <Stage cfg={cfg} logo={logo} />
      <ParticleSystem count={cfg.particles} />
    </Canvas>
  )
}
