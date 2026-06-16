import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { HighwaySign } from '@/components/r3f/HighwaySign.r3f'
import { AuthKiosk } from '@/components/r3f/AuthKiosk.r3f'
import { PlotField, type ReserveRect } from '@/components/city/PlotField.r3f'
import { Storefront } from '@/components/city/Storefront.r3f'
import { StorefrontDashboard } from '@/components/city/StorefrontDashboard.r3f'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { loadCityPlots } from '@/lib/city'
import { useCityStore } from '@/stores/cityStore'
import { useAuthStore } from '@/stores/authStore'
import type { WorldStage } from '@/stores/worldStore'

/**
 * Procedural instanced skyline for the landing descent — and, once the user
 * enters, the single persistent world that carries them through the whole flow:
 *   scroll descent → fly to the roadside kiosk (auth) → into the city + pan to the
 *   storefront (dashboard) → fly to the claimed plot.
 * Each leg is a blend ref (approach / toCity / toPlot) composed on top of the
 * scroll pose in useFrame, so transitions are seamless and cause no re-renders.
 */

const COLS = 16
const ROWS = 44
const SPACING = 12
const COUNT = COLS * ROWS

// The decorative skyline sits at the FRONT (street level) so the landing descent
// and the post-"Enter" fly-in read as driving down a real street. Two voids are
// carved through it: a central highway CORRIDOR (clear all the way in) and a
// NEIGHBORHOOD clearing deeper down where the claimable plots live — so the
// camera flies cleanly down the street and the plots never overlap the towers.
const SKYLINE_START = -6
const CORRIDOR_HALF_X = 22 // central highway kept clear of towers
const CLEARING_NEAR_Z = -150 // skyline removed between here…
const CLEARING_FAR_Z = -300 // …and here, leaving room for the neighborhood

// The claimable lot-and-block grid is already in world space (see cityGrid), so
// no extra offset is needed.
const CITY_OFFSET = new THREE.Vector3(0, 0, 0)

// Storefront: deep in the city, left of the highway, façade perpendicular to it
// (turned to face the road). The reserved rect keeps plot pads out from under it.
const STOREFRONT_POS: [number, number, number] = [-24, 0, -212]
const STOREFRONT_RESERVE: ReserveRect = { minX: -40, maxX: -8, minZ: -232, maxZ: -192 }

// Cheap deterministic hash → [0,1). Pure (no mutable seed), so it's safe to call
// during render inside useMemo.
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

export function CityField({
  progress,
  approach,
  toCity,
  toStore,
  toPlot,
  stage,
  authActive,
  onAuthSuccess,
  onEnterPlot,
}: {
  progress: RefObject<number>
  approach: RefObject<number>
  toCity: RefObject<number>
  toStore: RefObject<number>
  toPlot: RefObject<number>
  stage: WorldStage
  authActive: boolean
  onAuthSuccess: () => void
  onEnterPlot: () => void
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const crownRef = useRef<THREE.InstancedMesh>(null!)
  const { camera } = useThree()
  const damped = useRef(0)

  const plots = useCityStore((s) => s.plots)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)

  // Pull the plot grid once the user has left the landing.
  useEffect(() => {
    if (stage !== 'landing' && plots.length === 0) void loadCityPlots()
  }, [stage, plots.length])

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
        // Carve the highway corridor and the neighborhood clearing.
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
    // Carving drops some instances; only draw the ones we filled.
    bodyRef.current.count = buildings.length
    crownRef.current.count = buildings.length
    bodyRef.current.instanceMatrix.needsUpdate = true
    crownRef.current.instanceMatrix.needsUpdate = true
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (crownRef.current.instanceColor) crownRef.current.instanceColor.needsUpdate = true
  }, [buildings])

  // ── Camera waypoints ──
  const start = useMemo(
    () => ({ pos: new THREE.Vector3(0, 125, 100), tgt: new THREE.Vector3(0, 8, -70) }),
    [],
  )
  const end = useMemo(
    () => ({ pos: new THREE.Vector3(0, 7, 6), tgt: new THREE.Vector3(0, 18, -150) }),
    [],
  )
  const sign = useMemo(
    () => ({ pos: new THREE.Vector3(5, 6.2, 40), tgt: new THREE.Vector3(12.8, 5.7, 30.2) }),
    [],
  )
  // Dashboard, phase 1 — fly DEEP down the highway, through the skyline canyon and
  // into the neighborhood clearing, still facing −z.
  const cityDeep = useMemo(
    () => ({ pos: new THREE.Vector3(8, 9, -150), tgt: new THREE.Vector3(2, 8, -260) }),
    [],
  )
  // Dashboard, phase 2 — turn ~90° left to face the storefront (perpendicular to
  // the highway). Position barely moves; the target swings left, so it reads as a
  // pan after the fly-in has settled.
  const store = useMemo(
    () => ({ pos: new THREE.Vector3(10, 9, -212), tgt: new THREE.Vector3(-24, 8, -212) }),
    [],
  )
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpTgt = useMemo(() => new THREE.Vector3(), [])
  const plotPos = useMemo(() => new THREE.Vector3(), [])
  const plotTgt = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, dt) => {
    const target = progress.current ?? 0
    damped.current += (target - damped.current) * (1 - Math.exp(-3 * dt))
    const p = damped.current
    const e = p * p * (3 - 2 * p)
    tmpPos.lerpVectors(start.pos, end.pos, e)
    tmpTgt.lerpVectors(start.tgt, end.tgt, e)

    const a = approach.current ?? 0
    if (a > 0.0001) {
      const ae = a * a * (3 - 2 * a)
      tmpPos.lerp(sign.pos, ae)
      tmpTgt.lerp(sign.tgt, ae)
    }

    const c = toCity.current ?? 0
    if (c > 0.0001) {
      const ce = c * c * (3 - 2 * c)
      tmpPos.lerp(cityDeep.pos, ce)
      tmpTgt.lerp(cityDeep.tgt, ce)
    }

    const s = toStore.current ?? 0
    if (s > 0.0001) {
      const se = s * s * (3 - 2 * s)
      tmpPos.lerp(store.pos, se)
      tmpTgt.lerp(store.tgt, se)
    }

    const pl = toPlot.current ?? 0
    if (pl > 0.0001 && ownedPlot) {
      const wx = plotWorldX(ownedPlot.grid_x) + CITY_OFFSET.x
      const wz = plotWorldZ(ownedPlot.grid_z) + CITY_OFFSET.z
      plotPos.set(wx + 6, 24, wz + 40)
      plotTgt.set(wx, 2, wz)
      const ple = pl * pl * (3 - 2 * pl)
      tmpPos.lerp(plotPos, ple)
      tmpTgt.lerp(plotTgt, ple)
    }

    camera.position.copy(tmpPos)
    camera.lookAt(tmpTgt)
  })

  const showCity = stage !== 'landing'

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

      <HighwaySign />
      <AuthKiosk active={authActive} onSuccess={onAuthSuccess} />

      {showCity && (
        <>
          <group position={CITY_OFFSET}>
            <PlotField
              plots={plots}
              ownedPlotId={ownedPlot?.id ?? null}
              reserve={STOREFRONT_RESERVE}
            />
          </group>
          <Storefront position={STOREFRONT_POS}>
            {stage === 'dashboard' && (
              <StorefrontDashboard ownedPlot={ownedPlot} onPick={onEnterPlot} />
            )}
          </Storefront>
        </>
      )}
    </>
  )
}
