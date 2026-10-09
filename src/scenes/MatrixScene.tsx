import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Edges, Environment, Float, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { attachInput, input } from "../lib/input";
import { glowTexture, glyphTexture } from "../lib/textures";
import type { Tier } from "../lib/capabilities";
import { LOGO_SRC } from "../components/Logo";

const damp = THREE.MathUtils.damp;
const CYAN = "#C44552";

interface Cfg {
  dpr: number;
  particles: number;
  rain: number;
  code: number;
  cubes: number;
  panels: number;
  structures: number;
  env: boolean;
}
const CONFIG: Record<Exclude<Tier, "none">, Cfg> = {
  high: {
    dpr: 1.75,
    particles: 1400,
    rain: 26,
    code: 14,
    cubes: 10,
    panels: 4,
    structures: 12,
    env: true,
  },
  medium: {
    dpr: 1.5,
    particles: 700,
    rain: 16,
    code: 9,
    cubes: 6,
    panels: 3,
    structures: 8,
    env: true,
  },
  low: {
    dpr: 1.25,
    particles: 260,
    rain: 8,
    code: 5,
    cubes: 3,
    panels: 2,
    structures: 0,
    env: false,
  },
};

function Rig({ variant }: { variant: "hero" | "auth" }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const p = variant === "hero" ? input.scroll : 0;
    const tx = Math.sin(p * 2.6) * 3.4 + input.mx * 0.7;
    const ty = 1.4 - p * 2.4 + input.my * 0.45;
    const tz = 9.5 - p * 2.2;
    camera.position.x = damp(camera.position.x, tx, 3, dt);
    camera.position.y = damp(camera.position.y, ty, 3, dt);
    camera.position.z = damp(camera.position.z, tz, 3, dt);
    camera.lookAt(0, 0.3 - p * 1.0, 0);
  });
  return null;
}

function FloatingLogo() {
  const root = useRef<THREE.Group>(null);
  const mark = useRef<THREE.Group>(null);
  const source = useLoader(THREE.TextureLoader, LOGO_SRC);
  const shadowTexture = useMemo(() => glowTexture(), []);
  const shapes = useMemo(() => {
    const image = source.image as HTMLImageElement;
    const sampleSize = 256;
    const canvas = document.createElement("canvas");
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Unable to read the MATRIX logo image");
    context.drawImage(image, 0, 0, sampleSize, sampleSize);

    const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;
    const mask = new Uint8Array(sampleSize * sampleSize);
    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        mask[y * sampleSize + x] =
          pixels[(y * sampleSize + x) * 4 + 3] > 48 ? 1 : 0;
      }
    }

    const stride = sampleSize + 1;
    const edges: { from: number; to: number; used: boolean }[] = [];
    const outgoing = new Map<number, number[]>();
    const addEdge = (from: number, to: number) => {
      const edgeIndex = edges.length;
      edges.push({ from, to, used: false });
      const candidates = outgoing.get(from);
      if (candidates) candidates.push(edgeIndex);
      else outgoing.set(from, [edgeIndex]);
    };
    const filled = (x: number, y: number) =>
      x >= 0 &&
      x < sampleSize &&
      y >= 0 &&
      y < sampleSize &&
      mask[y * sampleSize + x] === 1;

    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        if (!filled(x, y)) continue;
        const topLeft = y * stride + x;
        const topRight = topLeft + 1;
        const bottomLeft = topLeft + stride;
        const bottomRight = bottomLeft + 1;
        if (!filled(x, y - 1)) addEdge(topLeft, topRight);
        if (!filled(x + 1, y)) addEdge(topRight, bottomRight);
        if (!filled(x, y + 1)) addEdge(bottomRight, bottomLeft);
        if (!filled(x - 1, y)) addEdge(bottomLeft, topLeft);
      }
    }

    const contours: {
      points: THREE.Vector2[];
      area: number;
      parent: number;
      depth: number;
    }[] = [];
    for (let firstEdge = 0; firstEdge < edges.length; firstEdge++) {
      if (edges[firstEdge].used) continue;
      const points: number[] = [];
      let edgeIndex = firstEdge;
      const start = edges[firstEdge].from;
      while (!edges[edgeIndex].used) {
        const edge = edges[edgeIndex];
        edge.used = true;
        points.push(edge.from);
        if (edge.to === start) break;

        const candidates = (outgoing.get(edge.to) ?? []).filter(
          (index) => !edges[index].used,
        );
        if (candidates.length === 0) break;
        if (candidates.length === 1) {
          edgeIndex = candidates[0];
          continue;
        }

        const fromX = edge.from % stride;
        const fromY = Math.floor(edge.from / stride);
        const toX = edge.to % stride;
        const toY = Math.floor(edge.to / stride);
        const incomingAngle = Math.atan2(toY - fromY, toX - fromX);
        edgeIndex = candidates.reduce((best, candidate) => {
          const next = edges[candidate];
          const nextX = next.to % stride;
          const nextY = Math.floor(next.to / stride);
          const angle = Math.atan2(nextY - toY, nextX - toX);
          const turn = (angle - incomingAngle + Math.PI * 2) % (Math.PI * 2);
          const bestEdge = edges[best];
          const bestX = bestEdge.to % stride;
          const bestY = Math.floor(bestEdge.to / stride);
          const bestAngle = Math.atan2(bestY - toY, bestX - toX);
          const bestTurn =
            (bestAngle - incomingAngle + Math.PI * 2) % (Math.PI * 2);
          return turn < bestTurn ? candidate : best;
        }, candidates[0]);
      }

      if (points.length < 3 || edges[edgeIndex].to !== start) continue;
      const simplified = points
        .filter((point, index) => {
          const previous = points[(index + points.length - 1) % points.length];
          const next = points[(index + 1) % points.length];
          const px = point % stride;
          const py = Math.floor(point / stride);
          const ax = px - (previous % stride);
          const ay = py - Math.floor(previous / stride);
          const bx = (next % stride) - px;
          const by = Math.floor(next / stride) - py;
          return ax * by !== ay * bx;
        })
        .map(
          (point) =>
            new THREE.Vector2(
              ((point % stride) / sampleSize - 0.5) * 4.2,
              (0.5 - Math.floor(point / stride) / sampleSize) * 4.2,
            ),
        );
      if (simplified.length < 3) continue;
      const area = THREE.ShapeUtils.area(simplified);
      if (Math.abs(area) < 0.0005) continue;
      contours.push({
        points: simplified,
        area: Math.abs(area),
        parent: -1,
        depth: 0,
      });
    }

    contours.sort((a, b) => b.area - a.area);
    const contains = (polygon: THREE.Vector2[], point: THREE.Vector2) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i];
        const b = polygon[j];
        if (
          a.y > point.y !== b.y > point.y &&
          point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
        ) {
          inside = !inside;
        }
      }
      return inside;
    };
    contours.forEach((contour, index) => {
      let parentArea = Infinity;
      contours.slice(0, index).forEach((candidate, candidateIndex) => {
        if (
          candidate.area < parentArea &&
          contains(candidate.points, contour.points[0])
        ) {
          contour.parent = candidateIndex;
          parentArea = candidate.area;
        }
      });
      contour.depth =
        contour.parent === -1 ? 0 : contours[contour.parent].depth + 1;
    });

    const paths = contours.map((contour) => {
      const points = [...contour.points];
      const clockwise = THREE.ShapeUtils.isClockWise(points);
      if (
        (contour.depth % 2 === 0 && !clockwise) ||
        (contour.depth % 2 === 1 && clockwise)
      ) {
        points.reverse();
      }
      return points;
    });
    const result: THREE.Shape[] = [];
    contours.forEach((contour, index) => {
      if (contour.depth % 2 === 0) result.push(new THREE.Shape(paths[index]));
    });
    if (result.length === 0)
      throw new Error("The MATRIX logo image contains no extrudable shape");
    return result;
  }, [source]);
  const geometries = useMemo(
    () =>
      shapes.map((shape) => {
        const front = new THREE.ExtrudeGeometry(shape, {
          depth: 0.36,
          bevelEnabled: true,
          bevelSegments: 4,
          bevelSize: 0.045,
          bevelThickness: 0.055,
          curveSegments: 1,
        });
        const positions = front.getAttribute("position");
        const colors = new Float32Array(positions.count * 3);
        const shadow = new THREE.Color("#08080A");
        const darkRed = new THREE.Color("#671923");
        const brightRed = new THREE.Color("#D35460");
        for (let i = 0; i < positions.count; i++) {
          const height = THREE.MathUtils.clamp(
            (positions.getY(i) + 2.1) / 4.2,
            0,
            1,
          );
          const color =
            height < 0.56
              ? shadow.clone().lerp(darkRed, height / 0.56)
              : darkRed.clone().lerp(brightRed, (height - 0.56) / 0.44);
          colors[i * 3] = color.r;
          colors[i * 3 + 1] = color.g;
          colors[i * 3 + 2] = color.b;
        }
        front.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const backing = new THREE.ExtrudeGeometry(shape, {
          depth: 0.4,
          bevelEnabled: false,
          curveSegments: 1,
        });
        return { front, backing };
      }),
    [shapes],
  );

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (mark.current) {
      mark.current.rotation.y = t * 0.25;
      mark.current.rotation.x = Math.sin(t * 0.32) * 0.045;
      mark.current.rotation.z = Math.sin(t * 0.4) * 0.05;
    }
    if (root.current) root.current.position.y = 0.6 + Math.sin(t * 0.9) * 0.12;
  });
  return (
    <group ref={root}>
      <group ref={mark} scale={0.9}>
        <mesh position={[0.08, -0.12, -0.62]}>
          <planeGeometry args={[4.8, 4.8]} />
          <meshBasicMaterial
            map={shadowTexture}
            color="#000000"
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
        {geometries.map(({ front, backing }, index) => (
          <group key={index}>
            <mesh position={[0.075, -0.075, -0.37 + index * 0.001]}>
              <primitive object={backing} attach="geometry" />
              <meshStandardMaterial
                color="#09090B"
                metalness={0.65}
                roughness={0.34}
              />
            </mesh>
            <mesh position={[0, 0, -0.18 + index * 0.001]}>
              <primitive object={front} attach="geometry" />
              <meshStandardMaterial
                attach="material-0"
                color="#FFFFFF"
                vertexColors
                metalness={0.48}
                roughness={0.24}
                emissive="#26070B"
                emissiveIntensity={0.28}
              />
              <meshStandardMaterial
                attach="material-1"
                color="#10090B"
                metalness={0.68}
                roughness={0.3}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function ParticleSystem({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#C44552"),
      new THREE.Color("#C44552"),
      new THREE.Color("#F4F4F5"),
      new THREE.Color("#F4F4F5"),
    ];
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 30;
      p[i * 3 + 1] = (Math.random() - 0.4) * 16;
      p[i * 3 + 2] = (Math.random() - 0.5) * 24;
      const col = palette[Math.floor(Math.random() * palette.length)];
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return { positions: p, colors: c };
  }, [count]);
  const map = useMemo(() => glowTexture(), []);
  useFrame((_, dt) => {
    const r = ref.current;
    if (!r) return;
    r.rotation.y += dt * 0.02;
    r.position.x = damp(r.position.x, input.mx * 0.6, 2, dt);
    r.position.y = damp(
      r.position.y,
      input.my * 0.4 + input.scroll * 1.5,
      2,
      dt,
    );
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        map={map}
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

const TRAIL = 8;
function DigitalRain({ columns }: { columns: number }) {
  const n = columns * TRAIL;
  const geo = useRef<THREE.BufferGeometry>(null);
  const data = useMemo(() => {
    const cx = new Float32Array(columns),
      cz = new Float32Array(columns),
      sp = new Float32Array(columns),
      head = new Float32Array(columns);
    for (let i = 0; i < columns; i++) {
      cx[i] = (Math.random() - 0.5) * 34;
      cz[i] = -4 - Math.random() * 14;
      sp[i] = 1.2 + Math.random() * 2.2;
      head[i] = Math.random() * 18 - 6;
    }
    const colors = new Float32Array(n * 3);
    for (let c = 0; c < columns; c++)
      for (let k = 0; k < TRAIL; k++) {
        const f = 1 - k / TRAIL;
        const idx = (c * TRAIL + k) * 3;
        colors[idx] = 0.13 * f;
        colors[idx + 1] = 0.9 * f;
        colors[idx + 2] = f;
      }
    return { cx, cz, sp, head, colors, pos: new Float32Array(n * 3) };
  }, [columns, n]);
  useFrame((_, dt) => {
    const d = data;
    for (let c = 0; c < columns; c++) {
      d.head[c] -= d.sp[c] * dt;
      if (d.head[c] < -6) d.head[c] = 12 + Math.random() * 4;
      for (let k = 0; k < TRAIL; k++) {
        const i = (c * TRAIL + k) * 3;
        d.pos[i] = d.cx[c];
        d.pos[i + 1] = d.head[c] + k * 0.22;
        d.pos[i + 2] = d.cz[c];
      }
    }
    const a = geo.current?.getAttribute("position");
    if (a) a.needsUpdate = true;
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geo}>
        <bufferAttribute
          attach="attributes-position"
          count={n}
          array={data.pos}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={n}
          array={data.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

const GLYPHS = ["</>", "{ }", "01", "AI", "=>", "#!", "[ ]", "λ", "&&", "0xFF"];
function CodeFragments({ count }: { count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        let x = (Math.random() - 0.5) * 22;
        if (Math.abs(x) < 3) x += x < 0 ? -3 : 3;
        return {
          g: GLYPHS[i % GLYPHS.length],
          pos: [x, (Math.random() - 0.2) * 8, -1 - Math.random() * 9] as [
            number,
            number,
            number,
          ],
          s: 0.7 + Math.random() * 0.7,
          speed: 0.8 + Math.random(),
        };
      }),
    [count],
  );
  return (
    <>
      {items.map((it, i) => (
        <Float
          key={i}
          speed={it.speed}
          floatIntensity={1.5}
          rotationIntensity={0}
        >
          <sprite position={it.pos} scale={[it.s * 1.6, it.s * 0.8, 1]}>
            <spriteMaterial
              map={glyphTexture(it.g)}
              transparent
              opacity={0.65}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </Float>
      ))}
    </>
  );
}

function HoloPanel({
  position,
  rotation = [0, 0, 0],
  w = 2.4,
  h = 1.5,
  color = CYAN,
  seed = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  w?: number;
  h?: number;
  color?: string;
  seed?: number;
}) {
  const bars = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        y: h / 2 - 0.28 - (i * (h - 0.5)) / 5,
        bw: 0.4 + (((i * 37 + seed * 13) % 10) / 10) * (w - 0.9),
      })),
    [w, h, seed],
  );
  return (
    <Float speed={1.4} floatIntensity={0.8} rotationIntensity={0.15}>
      <group position={position} rotation={rotation}>
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.07}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
          <Edges color={color} />
        </mesh>
        {bars.map((b, i) => (
          <mesh key={i} position={[-w / 2 + 0.2 + b.bw / 2, b.y, 0.01]}>
            <planeGeometry args={[b.bw, 0.05]} />
            <meshBasicMaterial color={color} transparent opacity={0.55} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function Cubes({ count }: { count: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = 4 + Math.random() * 2.5;
        return {
          pos: [
            Math.cos(a) * r,
            -1 + Math.random() * 4,
            Math.sin(a) * r - 2,
          ] as [number, number, number],
          s: 0.22 + Math.random() * 0.35,
          sp: 0.2 + Math.random() * 0.5,
        };
      }),
    [count],
  );
  useFrame((_, dt) => {
    refs.current.forEach((m, i) => {
      if (m) {
        m.rotation.x += dt * items[i].sp;
        m.rotation.y += dt * items[i].sp * 0.7;
      }
    });
  });
  return (
    <>
      {items.map((it, i) => (
        <Float
          key={i}
          speed={1 + it.sp}
          floatIntensity={1.2}
          rotationIntensity={0}
        >
          <mesh
            ref={(el) => {
              refs.current[i] = el;
            }}
            position={it.pos}
            scale={it.s}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#08121f"
              metalness={0.9}
              roughness={0.3}
            />
            <Edges color={i % 3 === 0 ? "#F4F4F5" : CYAN} />
          </mesh>
        </Float>
      ))}
    </>
  );
}

function Structures({ count }: { count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const r = 15 + Math.random() * 5;
        return {
          pos: [
            Math.cos(a) * r,
            -1 + Math.random() * 2,
            Math.sin(a) * r - 6,
          ] as [number, number, number],
          h: 4 + Math.random() * 9,
          w: 0.6 + Math.random() * 1.2,
        };
      }),
    [count],
  );
  return (
    <>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={[it.pos[0], it.pos[1] + it.h / 2 - 2, it.pos[2]]}
        >
          <boxGeometry args={[it.w, it.h, it.w]} />
          <meshBasicMaterial color="#111113" transparent opacity={0.85} />
          <Edges color="#3F1118" />
        </mesh>
      ))}
    </>
  );
}

function Lights() {
  const cyan = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    if (cyan.current) {
      cyan.current.position.x = damp(
        cyan.current.position.x,
        -4 + input.mx * 4,
        3,
        dt,
      );
      cyan.current.position.y = damp(
        cyan.current.position.y,
        2 + input.my * 2,
        3,
        dt,
      );
    }
  });
  return (
    <>
      <ambientLight intensity={0.5} color="#F4F4F5" />
      <directionalLight position={[-4, 6, 7]} intensity={3.5} color="#FFF1EF" />
      <directionalLight position={[4, -3, 2]} intensity={2.2} color="#C44552" />
      <pointLight
        ref={cyan}
        position={[-4, 2, 3]}
        intensity={70}
        color={CYAN}
      />
      <pointLight position={[5, -1, 2]} intensity={45} color="#F4F4F5" />
      <pointLight position={[0, 4, -3]} intensity={30} color="#C44552" />
    </>
  );
}

function Stage({ variant, cfg }: { variant: "hero" | "auth"; cfg: Cfg }) {
  const g = useRef<THREE.Group>(null);
  const { size } = useThree();
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    const wide = size.width / size.height > 1.2;
    const p = variant === "hero" ? input.scroll : 0;
    const tx =
      variant === "hero" && wide ? 2.7 * (1 - Math.min(1, p * 2.2)) : 0;
    const ty = variant === "hero" && !wide ? 0.6 : 0;
    const ts = wide ? 1 : 0.72;
    o.position.x = damp(o.position.x, tx, 2.5, dt);
    o.position.y = damp(o.position.y, ty, 2.5, dt);
    o.scale.setScalar(damp(o.scale.x, ts, 2.5, dt));
    o.rotation.y = damp(o.rotation.y, input.mx * 0.18 + p * 1.4, 2.5, dt);
  });
  return (
    <group ref={g}>
      <FloatingLogo />
      {cfg.panels > 0 && (
        <HoloPanel
          position={[-3.6, 1.6, 0.4]}
          rotation={[0, 0.5, 0]}
          seed={1}
        />
      )}
      {cfg.panels > 1 && (
        <HoloPanel
          position={[3.5, 2.2, -0.5]}
          rotation={[0, -0.5, 0]}
          w={2}
          h={1.2}
          color="#F4F4F5"
          seed={2}
        />
      )}
      {cfg.panels > 2 && (
        <HoloPanel
          position={[3.9, -0.6, 1]}
          rotation={[0, -0.7, 0]}
          w={1.8}
          h={1.1}
          seed={3}
        />
      )}
      {cfg.panels > 3 && (
        <HoloPanel
          position={[-4, -0.9, -0.5]}
          rotation={[0, 0.7, 0]}
          w={2.1}
          h={1.2}
          color="#C44552"
          seed={4}
        />
      )}
      <Cubes count={cfg.cubes} />
    </group>
  );
}

export default function MatrixScene({
  tier,
  variant = "hero",
}: {
  tier: Exclude<Tier, "none">;
  variant?: "hero" | "auth";
}) {
  const cfg = CONFIG[tier];
  useEffect(() => attachInput(), []);
  const rain = variant === "auth" ? Math.ceil(cfg.rain / 2) : cfg.rain;
  return (
    <Canvas
      dpr={[1, cfg.dpr]}
      camera={{ position: [0, 1.4, 9.5], fov: 45, near: 0.1, far: 80 }}
      gl={{
        antialias: tier === "high",
        alpha: false,
        powerPreference: "high-performance",
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#050506"]} />
      <fog attach="fog" args={["#050506", 10, 32]} />
      {cfg.env && (
        <Environment resolution={128} frames={1}>
          <Lightformer
            form="rect"
            intensity={4}
            color="#F4F4F5"
            position={[-5, 2, -2]}
            scale={[8, 3, 1]}
          />
          <Lightformer
            form="rect"
            intensity={3}
            color="#F4F4F5"
            position={[5, -1, -3]}
            scale={[8, 3, 1]}
          />
        </Environment>
      )}
      <Lights />
      <Rig variant={variant} />
      <Stage variant={variant} cfg={cfg} />
      <gridHelper
        args={[70, 70, "#3A0B12", "#090909"]}
        position={[0, -2.45, 0]}
        onUpdate={(o) => {
          const m = o.material as THREE.Material;
          m.transparent = true;
          m.opacity = 0.3;
        }}
      />
      <ParticleSystem
        count={
          variant === "auth" ? Math.round(cfg.particles * 0.6) : cfg.particles
        }
      />
      <DigitalRain columns={rain} />
      <CodeFragments count={cfg.code} />
      {cfg.structures > 0 && <Structures count={cfg.structures} />}
    </Canvas>
  );
}
