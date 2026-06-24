import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { builderArrivalPose } from '@/constants/builder'
import { useAuthStore } from '@/stores/authStore'
import { useCityStore } from '@/stores/cityStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'
import type { WorldStage } from '@/stores/worldStore'

const CITY_OFFSET = new THREE.Vector3(0, 0, 0)

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

export function CameraRig({
  progress,
  approach,
  toCity,
  toStore,
  toPlot,
  toBuilder,
  stage,
}: {
  progress: RefObject<number>
  approach: RefObject<number>
  toCity: RefObject<number>
  toStore: RefObject<number>
  toPlot: RefObject<number>
  toBuilder: RefObject<number>
  stage: WorldStage
}) {
  const { camera } = useThree()
  const damped = useRef(0)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const timeOfDay = useCityStore((s) => s.timeOfDay)
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)

  const dn = useRef(timeOfDay === 'day' ? 1 : 0)
  const dnTarget = useRef(timeOfDay === 'day' ? 1 : 0)
  const ambRef = useRef<THREE.AmbientLight>(null!)
  const dirRef = useRef<THREE.DirectionalLight>(null!)
  const bgRef = useRef<THREE.Color>(null!)
  const fogRef = useRef<THREE.Fog>(null!)

  useEffect(() => {
    dnTarget.current = timeOfDay === 'day' ? 1 : 0
  }, [timeOfDay])

  // Camera waypoints
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
  const cityDeep = useMemo(
    () => ({ pos: new THREE.Vector3(8, 9, -150), tgt: new THREE.Vector3(2, 8, -260) }),
    [],
  )
  const store = useMemo(
    () => ({ pos: new THREE.Vector3(23, 14, -212), tgt: new THREE.Vector3(-7, 9.5, -212) }),
    [],
  )
  const tmpPos = useMemo(() => new THREE.Vector3(), [])
  const tmpTgt = useMemo(() => new THREE.Vector3(), [])
  const stagePos = useMemo(() => new THREE.Vector3(), [])
  const stageTgt = useMemo(() => new THREE.Vector3(), [])
  const arrivePos = useMemo(() => new THREE.Vector3(), [])
  const arriveTgt = useMemo(() => new THREE.Vector3(), [])
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

    if (stage !== 'builder') {
      camera.position.copy(tmpPos)
      camera.lookAt(tmpTgt)
    }

    // Day/night atmosphere blend
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

  return (
    <>
      <color ref={bgRef} attach="background" args={[PALETTE.void]} />
      <fog ref={fogRef} attach="fog" args={[PALETTE.purple, 45, 500]} />
      <ambientLight ref={ambRef} intensity={0.28} />
      <directionalLight ref={dirRef} position={[40, 90, 30]} intensity={0.55} color={PALETTE.cyan} />
      <hemisphereLight args={[PALETTE.magenta, PALETTE.void, 0.35]} />
    </>
  )
}
