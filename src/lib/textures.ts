import * as THREE from 'three'

let glow: THREE.CanvasTexture | null = null
export function glowTexture(): THREE.CanvasTexture {
  if (glow) return glow
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 64, 64)
  glow = new THREE.CanvasTexture(c)
  return glow
}

const glyphs = new Map<string, THREE.CanvasTexture>()
export function glyphTexture(text: string): THREE.CanvasTexture {
  const hit = glyphs.get(text)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const x = c.getContext('2d')!
  x.font = 'bold 34px "JetBrains Mono", monospace'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.shadowColor = '#C44552'
  x.shadowBlur = 12
  x.fillStyle = '#F2C9CC'
  x.fillText(text, 64, 34)
  const t = new THREE.CanvasTexture(c)
  glyphs.set(text, t)
  return t
}
