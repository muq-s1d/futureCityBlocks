import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'

/**
 * Procedural instanced skyline for the landing descent.
 * - Two InstancedMeshes only (bodies + neon crowns) → 2 draw calls for ~600 buildings.
 * - Camera flies from high aerial (progress 0) to street level (progress 1),
 *   driven by a damped scroll-progress ref so there are zero React re-renders.
 */

const COLS = 16
const ROWS = 44
const SPACING = 12
const COUNT = COLS * ROWS

// District tint across the grid: cyan → amber → magenta (matches city districts).
function tintForCol(c: number): THREE.Color {
  const t = c / (COLS - 1)
  if (t < 0.42) return new THREE.Color(PALETTE.cyan)
  if (t < 0.66) return new THREE.Color(PALETTE.amber)
  return new THREE.Color(PALETTE.magenta)
}

interface Building {
  x: number
  z: number
  h: number
  w: number
  d: number
  tint: THREE.Color
}

export function CityField({ progress }: { progress: RefObject<number> }) {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const crownRef = useRef<THREE.InstancedMesh>(null!)
  const { camera } = useThree()
  const damped = useRef(0)

  const buildings = useMemo<Building[]>(() => {
    // Deterministic LCG so the skyline is stable across reloads.
    let seed = 1337
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }
    const arr: Building[] = []
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = (c - (COLS - 1) / 2) * SPACING + (rand() - 0.5) * 3
        const z = -r * SPACING + (rand() - 0.5) * 3
        const h = 2 + rand() * rand() * 50 // skew toward shorter, a few towers
        const w = 4 + rand() * 4
        const d = 4 + rand() * 4
        arr.push({ x, z, h, w, d, tint: tintForCol(c) })
      }
    }
    return arr
  }, [])

  useLayoutEffect(() => {
    const m = new THREE.Matrix4()
    const bodyColor = new THREE.Color()
    const surface = new THREE.Color(PALETTE.surface)
    const crownH = 0.7
    buildings.forEach((b, i) => {
      // Body: dark, faint district tint revealed by lighting.
      m.makeScale(b.w, b.h, b.d)
      m.setPosition(b.x, b.h / 2, b.z)
      bodyRef.current.setMatrixAt(i, m)
      bodyColor.copy(b.tint).multiplyScalar(0.14).lerp(surface, 0.45)
      bodyRef.current.setColorAt(i, bodyColor)
      // Crown: thin full-bright neon cap → reads as a glowing rooftop.
      m.makeScale(b.w * 0.94, crownH, b.d * 0.94)
      m.setPosition(b.x, b.h + crownH / 2, b.z)
      crownRef.current.setMatrixAt(i, m)
      crownRef.current.setColorAt(i, b.tint)
    })
    bodyRef.current.instanceMatrix.needsUpdate = true
    crownRef.current.instanceMatrix.needsUpdate = true
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (crownRef.current.instanceColor) crownRef.current.instanceColor.needsUpdate = true
  }, [buildings])

  const start = useMemo(
    () => ({ pos: new THREE.Vector3(0, 125, 100), tgt: new THREE.Vector3(0, 8, -70) }),
    [],
  )
  const end = useMemo(
    () => ({ pos: new THREE.Vector3(0, 7, 6), tgt: new THREE.Vector3(0, 18, -150) }),
    [],
  )
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpTgt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const target = progress.current ?? 0
    // Frame-rate-independent damping toward the scroll target (cinematic ease).
    damped.current += (target - damped.current) * (1 - Math.exp(-3 * dt))
    const p = damped.current
    const e = p * p * (3 - 2 * p) // smoothstep
    tmpPos.lerpVectors(start.pos, end.pos, e)
    tmpTgt.lerpVectors(start.tgt, end.tgt, e)
    camera.position.copy(tmpPos)
    camera.lookAt(tmpTgt)
  })

  return (
    <>
      <color attach="background" args={[PALETTE.void]} />
      <fog attach="fog" args={[PALETTE.purple, 45, 300]} />
      <ambientLight intensity={0.28} />
      <directionalLight position={[40, 90, 30]} intensity={0.55} color={PALETTE.cyan} />
      <hemisphereLight args={[PALETTE.magenta, PALETTE.void, 0.35]} />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -240]}>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color={PALETTE.void} roughness={1} metalness={0} />
      </mesh>

      <instancedMesh ref={bodyRef} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.75} metalness={0.25} />
      </instancedMesh>

      <instancedMesh ref={crownRef} args={[undefined, undefined, COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}
