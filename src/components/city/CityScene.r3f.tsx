import { useEffect, useRef, type ComponentRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { useCityStore } from '@/stores/cityStore'
import { plotWorldX, plotWorldZ, CITY_HALF_WIDTH } from '@/lib/cityGrid'
import { PlotField } from '@/components/city/PlotField.r3f'
import { Rain } from '@/components/city/Rain.r3f'
import type { Plot } from '@/types/db'

/**
 * The city world: a centred 20×10 plot grid under a cyberpunk sky. Day/night is
 * a GSAP-tweened blend that lerps fog, background and lights each frame (no React
 * re-renders); rain mounts on demand. The camera opens on an aerial overview and
 * flies down to the player's owned plot.
 */

// Night ↔ day atmosphere presets (t = 0 night, 1 day).
const NIGHT = {
  bg: new THREE.Color('#07070d'),
  fog: new THREE.Color('#0a0a14'),
  fogNear: 70,
  fogFar: 360,
  amb: 0.3,
  dir: 0.5,
  dirColor: new THREE.Color(PALETTE.cyan),
}
const DAY = {
  bg: new THREE.Color('#241a33'),
  fog: new THREE.Color('#2c2342'),
  fogNear: 110,
  fogFar: 520,
  amb: 0.7,
  dir: 1.0,
  dirColor: new THREE.Color('#ffd9a0'),
}

export function CityScene({
  plots,
  ownedPlot,
  flyToken,
  onHoverChange,
  onSelectPlot,
}: {
  plots: Plot[]
  ownedPlot: Plot | null
  flyToken: number
  onHoverChange: (plot: Plot | null) => void
  onSelectPlot: (plot: Plot) => void
}) {
  const timeOfDay = useCityStore((s) => s.timeOfDay)
  const weather = useCityStore((s) => s.weather)

  // 0 = night, 1 = day. `dn` eases toward `dnTarget` each frame (no re-renders);
  // bg/fog/lights are attached declaratively and mutated through refs.
  const dn = useRef(timeOfDay === 'day' ? 1 : 0)
  const dnTarget = useRef(timeOfDay === 'day' ? 1 : 0)
  const ambRef = useRef<THREE.AmbientLight>(null!)
  const dirRef = useRef<THREE.DirectionalLight>(null!)
  const bgRef = useRef<THREE.Color>(null!)
  const fogRef = useRef<THREE.Fog>(null!)

  useEffect(() => {
    dnTarget.current = timeOfDay === 'day' ? 1 : 0
  }, [timeOfDay])

  useFrame((_, dt) => {
    dn.current += (dnTarget.current - dn.current) * (1 - Math.exp(-2.2 * dt))
    const t = dn.current
    if (bgRef.current) bgRef.current.copy(NIGHT.bg).lerp(DAY.bg, t)
    if (fogRef.current) {
      const fog = fogRef.current
      fog.color.copy(NIGHT.fog).lerp(DAY.fog, t)
      fog.near = THREE.MathUtils.lerp(NIGHT.fogNear, DAY.fogNear, t)
      fog.far = THREE.MathUtils.lerp(NIGHT.fogFar, DAY.fogFar, t)
    }
    if (ambRef.current) ambRef.current.intensity = THREE.MathUtils.lerp(NIGHT.amb, DAY.amb, t)
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(NIGHT.dir, DAY.dir, t)
      dirRef.current.color.copy(NIGHT.dirColor).lerp(DAY.dirColor, t)
    }
  })

  return (
    <>
      <color ref={bgRef} attach="background" args={['#07070d']} />
      <fog ref={fogRef} attach="fog" args={['#0a0a14', 70, 360]} />
      <ambientLight ref={ambRef} intensity={NIGHT.amb} />
      <directionalLight ref={dirRef} position={[60, 120, 40]} intensity={NIGHT.dir} color={PALETTE.cyan} />
      <hemisphereLight args={[PALETTE.magenta, PALETTE.void, 0.25]} />

      {/* Ground: dark slab beneath the grid; the gaps between tiles read as roads. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[CITY_HALF_WIDTH * 4, CITY_HALF_WIDTH * 4]} />
        <meshStandardMaterial color="#050509" roughness={1} metalness={0} />
      </mesh>

      <PlotField
        plots={plots}
        ownedPlotId={ownedPlot?.id ?? null}
        onHover={onHoverChange}
        onSelect={onSelectPlot}
      />

      {weather === 'rain' && <Rain />}

      <CameraRig ownedPlot={ownedPlot} flyToken={flyToken} />
    </>
  )
}

/**
 * Opens on an aerial overview, then flies down to the owner's plot once it loads
 * (and again whenever `flyToken` changes, i.e. the HUD "find my plot" button).
 */
function CameraRig({ ownedPlot, flyToken }: { ownedPlot: Plot | null; flyToken: number }) {
  const ref = useRef<ComponentRef<typeof CameraControls>>(null!)
  const flewIn = useRef(false)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    c.smoothTime = 0.9
    c.minDistance = 16
    c.maxDistance = 380
    c.maxPolarAngle = Math.PI * 0.49 // stay above the ground plane
    c.setLookAt(0, 200, 180, 0, 0, 0, false)
  }, [])

  const flyToOwned = (transition: boolean) => {
    const c = ref.current
    if (!c || !ownedPlot) return
    const x = plotWorldX(ownedPlot.grid_x)
    const z = plotWorldZ(ownedPlot.grid_z)
    c.setLookAt(x, 30, z + 50, x, 1, z, transition)
  }

  // Initial cinematic descent once the owned plot is known.
  useEffect(() => {
    if (flewIn.current || !ownedPlot) return
    flewIn.current = true
    const id = window.setTimeout(() => flyToOwned(true), 650)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedPlot])

  // HUD "find my plot".
  useEffect(() => {
    if (flyToken > 0) flyToOwned(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToken])

  return <CameraControls ref={ref} makeDefault />
}
