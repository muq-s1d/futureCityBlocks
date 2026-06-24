import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { HighwaySign } from '@/components/r3f/HighwaySign.r3f'
import { AuthKiosk } from '@/components/r3f/AuthKiosk.r3f'
import { PlotField, type ReserveRect } from '@/components/city/PlotField.r3f'
import { Rain } from '@/components/city/Rain.r3f'
import { Storefront } from '@/components/city/Storefront.r3f'
import { StorefrontAtmosphere } from '@/components/city/StorefrontAtmosphere.r3f'
import { StorefrontDashboard } from '@/components/city/StorefrontDashboard.r3f'
import { BuilderScene } from '@/components/builder/BuilderScene.r3f'
import { AssetMesh } from '@/components/r3f/AssetMesh.r3f'
import { PlotGroundPicker } from '@/components/city/PlotGroundPicker.r3f'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { builderArrivalPose } from '@/constants/builder'
import type { PlacedAsset } from '@/lib/assets'
import { loadCityPlots } from '@/lib/city'
import { useCityStore } from '@/stores/cityStore'
import { useAuthStore } from '@/stores/authStore'
import { useQualityStore } from '@/stores/qualityStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'
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
const CORRIDOR_HALF_X = 30 // central highway kept clear of towers
const CLEARING_NEAR_Z = -160 // skyline removed between here…
const CLEARING_FAR_Z = -540 // …and here, leaving room for the neighborhood

// The claimable lot-and-block grid is already in world space (see cityGrid), so
// no extra offset is needed.
const CITY_OFFSET = new THREE.Vector3(0, 0, 0)

// Storefront: deep in the city, left of the highway, façade perpendicular to it
// (turned to face the road). The reserved rect keeps plot pads out from under it.
const STOREFRONT_POS: [number, number, number] = [-24, 0, -212]
const STOREFRONT_RESERVE: ReserveRect = { minX: -40, maxX: -8, minZ: -232, maxZ: -192 }

// Night ↔ day atmosphere presets (t = 0 night, 1 day). NIGHT is exactly the
// original static landing/world look, so the descent is unchanged; the in-city
// HUD can blend toward DAY (GSAP-free: eased each frame through refs, no
// re-renders), matching the City World Rules.
const NIGHT = {
  bg: new THREE.Color(PALETTE.void),
  fog: new THREE.Color(PALETTE.purple),
  fogNear: 45,
  fogFar: 500,
  amb: 0.28,
  dir: 0.55,
  dirColor: new THREE.Color(PALETTE.cyan),
}
const DAY = {
  bg: new THREE.Color('#2a2140'),
  fog: new THREE.Color('#3a2f55'),
  fogNear: 80,
  fogFar: 650,
  amb: 0.66,
  dir: 1.0,
  dirColor: new THREE.Color('#ffd9a0'),
}

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
  toBuilder,
  stage,
  authActive,
  placedObjects,
  placing,
  onAuthSuccess,
  onEnterPlot,
  onSignOut,
  onRequestDelete,
  onGroundPick,
}: {
  progress: RefObject<number>
  approach: RefObject<number>
  toCity: RefObject<number>
  toStore: RefObject<number>
  toPlot: RefObject<number>
  toBuilder: RefObject<number>
  stage: WorldStage
  authActive: boolean
  placedObjects: PlacedAsset[]
  placing: boolean
  onAuthSuccess: () => void
  onEnterPlot: (districtId: string) => void
  onSignOut: () => void
  onRequestDelete: () => void
  onGroundPick: (x: number, z: number) => void
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null!)
  const crownRef = useRef<THREE.InstancedMesh>(null!)
  const { camera } = useThree()
  const damped = useRef(0)

  const plots = useCityStore((s) => s.plots)
  const timeOfDay = useCityStore((s) => s.timeOfDay)
  const weather = useCityStore((s) => s.weather)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const downgrade = useQualityStore((s) => s.downgrade)
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)

  // Day/night blend (0 = night, 1 = day): eased toward its target each frame and
  // applied to bg/fog/lights through refs, so toggling never re-renders the scene.
  const dn = useRef(timeOfDay === 'day' ? 1 : 0)
  const dnTarget = useRef(timeOfDay === 'day' ? 1 : 0)
  const ambRef = useRef<THREE.AmbientLight>(null!)
  const dirRef = useRef<THREE.DirectionalLight>(null!)
  const bgRef = useRef<THREE.Color>(null!)
  const fogRef = useRef<THREE.Fog>(null!)

  useEffect(() => {
    dnTarget.current = timeOfDay === 'day' ? 1 : 0
  }, [timeOfDay])

  const loadWorldConfig = useWorldConfigStore((s) => s.loadWorldConfig)

  useEffect(() => {
    if (stage !== 'landing' && plots.length === 0) {
      void loadWorldConfig().then(() => loadCityPlots())
    }
  }, [stage, plots.length, loadWorldConfig])

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
  // Façade front plane is at world x ≈ -12 (storefront at x −24, +12 local depth);
  // back off far enough to frame the full multi-bay frontage, look at bay height,
  // tilted down a touch so the wet floor reads in the foreground.
  const store = useMemo(
    () => ({ pos: new THREE.Vector3(23, 14, -212), tgt: new THREE.Vector3(-7, 9.5, -212) }),
    [],
  )
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpTgt = useMemo(() => new THREE.Vector3(), [])
  // Plot fly-to is a two-leg route (staging → arrival); both poses are recomputed
  // per frame from the owned plot, kept inside the tower-free neighborhood band.
  const stagePos = useMemo(() => new THREE.Vector3(), [])
  const stageTgt = useMemo(() => new THREE.Vector3(), [])
  const arrivePos = useMemo(() => new THREE.Vector3(), [])
  const arriveTgt = useMemo(() => new THREE.Vector3(), [])
  // Builder entry/exit waypoint — in front of and above the lot, looking at it.
  // Matches BuilderScene's home pose so the hand-off to the FPS controller (and
  // the return on exit) is seamless. Recomputed per frame from the owned plot.
  const builderPos = useMemo(() => new THREE.Vector3(), [])
  const builderTgt = useMemo(() => new THREE.Vector3(), [])

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
      const wx = plotWorldX(ownedPlot.grid_x, cityConfig) + CITY_OFFSET.x
      const wz = plotWorldZ(ownedPlot.grid_z, cityConfig) + CITY_OFFSET.z
      const side = wx < 0 ? -1 : 1
      // The plots sit in the cleared band (z −150…−300). A straight line from the
      // storefront to a near-row plot used to cross z=−150 into the skyline and
      // skim other lots. Instead route in two legs that never leave the band:
      //   leg 1 — pull back onto the highway corridor at the plot's depth, high up
      //   leg 2 — descend laterally from the road onto the plot.
      stagePos.set(side * 18, 28, wz)
      stageTgt.set(wx, 1, wz)
      arrivePos.set(wx - side * 18, 14, wz + 20)
      arriveTgt.set(wx, 0.6, wz)

      const leg1 = Math.min(pl / 0.5, 1)
      const l1 = leg1 * leg1 * (3 - 2 * leg1)
      tmpPos.lerp(stagePos, l1)
      tmpTgt.lerp(stageTgt, l1)

      if (pl > 0.5) {
        const leg2 = (pl - 0.5) / 0.5
        const l2 = leg2 * leg2 * (3 - 2 * leg2)
        tmpPos.lerp(arrivePos, l2)
        tmpTgt.lerp(arriveTgt, l2)
      }
    }

    const tb = toBuilder.current ?? 0
    if (tb > 0.0001 && ownedPlot) {
      const wx = plotWorldX(ownedPlot.grid_x, cityConfig) + CITY_OFFSET.x
      const wz = plotWorldZ(ownedPlot.grid_z, cityConfig) + CITY_OFFSET.z
      const arrival = builderArrivalPose(wx, wz)
      builderPos.set(...arrival.pos)
      builderTgt.set(...arrival.tgt)
      const be = tb * tb * (3 - 2 * tb)
      tmpPos.lerp(builderPos, be)
      tmpTgt.lerp(builderTgt, be)
    }

    // While stage === 'builder', BuilderScene's FPS controller owns the camera —
    // CityField must NOT also write it, or the two fight and the view jitters.
    // The toBuilder leg above still runs during the 'plot'→builder fly-in and the
    // builder→'plot' return (both happen while stage is 'plot'), handing off to /
    // from BuilderScene's matching home pose.
    if (stage !== 'builder') {
      camera.position.copy(tmpPos)
      camera.lookAt(tmpTgt)
    }

    // Day/night: ease the blend and push it into bg/fog/lights (no re-render).
    dn.current += (dnTarget.current - dn.current) * (1 - Math.exp(-2.2 * dt))
    const t = dn.current
    if (bgRef.current) bgRef.current.copy(NIGHT.bg).lerp(DAY.bg, t)
    if (fogRef.current) {
      fogRef.current.color.copy(NIGHT.fog).lerp(DAY.fog, t)
      fogRef.current.near = THREE.MathUtils.lerp(NIGHT.fogNear, DAY.fogNear, t)
      fogRef.current.far = THREE.MathUtils.lerp(NIGHT.fogFar, DAY.fogFar, t)
    }
    if (ambRef.current) ambRef.current.intensity = THREE.MathUtils.lerp(NIGHT.amb, DAY.amb, t)
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(NIGHT.dir, DAY.dir, t)
      dirRef.current.color.copy(NIGHT.dirColor).lerp(DAY.dirColor, t)
    }
  })

  const showCity = stage !== 'landing'

  return (
    <>
      {/* Runtime guardrail: if the framerate sags, step the quality tier down
          (drops dpr + the heavy effects) so 60fps is preserved on weak hardware. */}
      <PerformanceMonitor onDecline={() => downgrade()} />

      <color ref={bgRef} attach="background" args={[PALETTE.void]} />
      <fog ref={fogRef} attach="fog" args={[PALETTE.purple, 45, 500]} />
      <ambientLight ref={ambRef} intensity={0.28} />
      <directionalLight ref={dirRef} position={[40, 90, 30]} intensity={0.55} color={PALETTE.cyan} />
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
              hideBeacon={stage === 'builder'}
            />
            {/* Placed assets show on the plot AND as context while building. */}
            {(stage === 'plot' || stage === 'builder') &&
              placedObjects.map((obj) => <AssetMesh key={obj.id} object={obj} />)}
            {/* Ground picker for placing a saved asset (PlotHud "place" mode). */}
            {placing && stage === 'plot' && ownedPlot && (
              <PlotGroundPicker plot={ownedPlot} onPick={onGroundPick} />
            )}
          </group>

          {/* First-person voxel builder owns the camera while stage === 'builder'. */}
          {stage === 'builder' && <BuilderScene />}
          <Storefront position={STOREFRONT_POS}>
            <StorefrontAtmosphere />
            {stage === 'dashboard' && (
              <StorefrontDashboard
                ownedPlot={ownedPlot}
                onPick={onEnterPlot}
                onSignOut={onSignOut}
                onRequestDelete={onRequestDelete}
              />
            )}
          </Storefront>
          {/* Rain is centred on the grid; offset it down −z to blanket the
              highway approach and the neighborhood clearing where the plots are. */}
          {weather === 'rain' && (
            <group position={[0, 0, -150]}>
              <Rain />
            </group>
          )}
        </>
      )}
    </>
  )
}
