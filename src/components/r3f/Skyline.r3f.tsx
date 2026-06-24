import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'

const COLS = 16
const ROWS = 44
const SPACING = 12
const COUNT = COLS * ROWS

const SKYLINE_START = -6
const CORRIDOR_HALF_X = 30
const CLEARING_NEAR_Z = -160
const CLEARING_FAR_Z = -540

function hash(n: number): number {
  const v = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return v - Math.floor(v)
}

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

export function Skyline() {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const crownRef = useRef<THREE.InstancedMesh>(null!)

  const buildings = useMemo<Building[]>(() => {
    const arr: Building[] = []
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const base = (c * ROWS + r) * 6
        const x = (c - (COLS - 1) / 2) * SPACING + (hash(base) - 0.5) * 3
        const z = SKYLINE_START - r * SPACING + (hash(base + 1) - 0.5) * 3
        const h = 2 + hash(base + 2) * hash(base + 3) * 50
        const w = 4 + hash(base + 4) * 4
        const d = 4 + hash(base + 5) * 4
        if (Math.abs(x) < CORRIDOR_HALF_X) continue
        if (z < CLEARING_NEAR_Z && z > CLEARING_FAR_Z) continue
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
      m.makeScale(b.w, b.h, b.d)
      m.setPosition(b.x, b.h / 2, b.z)
      bodyRef.current.setMatrixAt(i, m)
      bodyColor.copy(b.tint).multiplyScalar(0.14).lerp(surface, 0.45)
      bodyRef.current.setColorAt(i, bodyColor)
      m.makeScale(b.w * 0.94, crownH, b.d * 0.94)
      m.setPosition(b.x, b.h + crownH / 2, b.z)
      crownRef.current.setMatrixAt(i, m)
      crownRef.current.setColorAt(i, b.tint)
    })
    bodyRef.current.count = buildings.length
    crownRef.current.count = buildings.length
    bodyRef.current.instanceMatrix.needsUpdate = true
    crownRef.current.instanceMatrix.needsUpdate = true
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (crownRef.current.instanceColor) crownRef.current.instanceColor.needsUpdate = true
  }, [buildings])

  return (
    <>
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
