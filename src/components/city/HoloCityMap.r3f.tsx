import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { plotWorldX, plotWorldZ, districtForColumn } from '@/lib/cityGrid'
import { useQualityCaps } from '@/stores/qualityStore'
import { useStorefrontStore } from '@/stores/storefrontStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'
import type { Plot } from '@/types/db'

/**
 * The MY PLOTS display: a big holographic top-down map of the REAL city, floating
 * in the shop window. Every one of the 200 lots is a flat neon pad at its true grid
 * position (same cityGrid math the world uses), so the central highway, the blocks,
 * alleys and streets, and the three district colour zones all read exactly like the
 * live city — and exactly like the flat lots really look. Claimed lots glow bright;
 * your own lot gets a pulsing ring. A radar line sweeps across; the whole map slowly
 * turns. Three clickable legend chips below drive claim / enter.
 *
 * The map is stood UP to face the (near-horizontal) camera — a top-down view — both
 * so it reads big instead of edge-on, and so it sweeps little depth when it spins
 * and therefore fits inside the shallow window recess without clipping the glass.
 */

const MONO = '/fonts/ShareTechMono-Regular.ttf'
const DISPLAY = '/fonts/Orbitron.ttf'

const TILT = 1.3
const HALF_X = 7.0
const SWAY = 0.42

const tmp = new THREE.Object3D()
const tmpC = new THREE.Color()

export function HoloCityMap({
  plots,
  ownedPlot,
  onPick,
}: {
  plots: Plot[]
  ownedPlot: Plot | null
  onPick: (districtId: string) => void
}) {
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)
  const districts = useWorldConfigStore((s) => s.districts)
  const caps = useQualityCaps()
  const animated = caps.animatedHolograms
  const [hover, setHover] = useState<string | null>(null)
  const setFocus = useStorefrontStore((s) => s.setFocus)

  const ownedDistrict = ownedPlot ? districtForColumn(ownedPlot.grid_x, districts).id : null

  const { SC, HALF_Z, PAD, mini } = useMemo(() => {
    const cz = (plotWorldZ(0, cityConfig) + plotWorldZ(cityConfig.GRID_ROWS - 1, cityConfig)) / 2
    const xHalf = Math.abs(plotWorldX(0, cityConfig))
    const zHalf = Math.abs(plotWorldZ(0, cityConfig) - cz)
    const sc = HALF_X / xHalf
    const halfZ = zHalf * sc
    const pad = cityConfig.LOT * sc * 0.48
    const miniFn = (gx: number, gz: number): [number, number] => [
      plotWorldX(gx, cityConfig) * sc,
      (plotWorldZ(gz, cityConfig) - cz) * sc,
    ]
    return { CZ: cz, SC: sc, HALF_Z: halfZ, PAD: pad, mini: miniFn }
  }, [cityConfig])

  const stats = useMemo(() => {
    const m: Record<string, { total: number; owned: number; open: number }> = {}
    for (const d of districts) m[d.id] = { total: 0, owned: 0, open: 0 }
    for (const p of plots) {
      const s = m[districtForColumn(p.grid_x, districts).id]
      if (!s) continue
      s.total++
      if (p.owner_id) s.owned++
      else s.open++
    }
    return m
  }, [plots, districts])

  const padRef = useRef<THREE.InstancedMesh>(null!)
  useLayoutEffect(() => {
    const mesh = padRef.current
    if (!mesh) return
    plots.forEach((p, i) => {
      const [x, z] = mini(p.grid_x, p.grid_z)
      tmp.position.set(x, 0, z)
      tmp.rotation.set(0, 0, 0)
      tmp.scale.set(PAD, 0.04, PAD)
      tmp.updateMatrix()
      mesh.setMatrixAt(i, tmp.matrix)
      const d = districtForColumn(p.grid_x, districts)
      const lit = hover === d.id || ownedDistrict === d.id
      const own = ownedPlot?.id === p.id
      const k = own ? 1.6 : p.owner_id ? 1 : lit ? 0.85 : 0.42
      tmpC.set(own ? '#ffffff' : d.color).multiplyScalar(own ? 1 : k)
      mesh.setColorAt(i, tmpC)
    })
    mesh.count = plots.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [plots, hover, ownedDistrict, ownedPlot, mini, PAD, districts])

  const spin = useRef<THREE.Group>(null)
  const radar = useRef<THREE.Mesh>(null)
  const scan = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (spin.current) spin.current.rotation.y = Math.sin(t * 0.28) * SWAY
    if (animated && radar.current) {
      const s = (t % 4) / 4
      radar.current.scale.set(s * HALF_X * 1.3, s * HALF_X * 1.3, 1)
      ;(radar.current.material as THREE.MeshBasicMaterial).opacity = (1 - s) * 0.22
    }
    if (animated && scan.current) {
      const s = (t * 0.5) % 1
      scan.current.position.z = -HALF_Z + s * HALF_Z * 2
      ;(scan.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(s * Math.PI) * 0.3
    }
  })

  const available = (id: string) =>
    ownedPlot ? id === ownedDistrict : (stats[id]?.open ?? 0) > 0

  const ownedMini = ownedPlot ? mini(ownedPlot.grid_x, ownedPlot.grid_z) : null

  return (
    <group>
      <Text
        font={MONO}
        fontSize={0.62}
        letterSpacing={0.22}
        color={PALETTE.cyan}
        anchorX="center"
        anchorY="middle"
        position={[0, 7.7, 0.2]}
      >
        {ownedPlot ? '◢ YOUR LOT IS LIVE ON THE GRID' : '◢ SELECT A DISTRICT TO CLAIM'}
      </Text>

      <group position={[0, 0.5, 0]} rotation-x={TILT}>
        <group ref={spin}>
          <mesh position={[0, -0.03, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[HALF_X * 2.1, HALF_Z * 2.5]} />
            <meshBasicMaterial color="#02060a" transparent opacity={0.72} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.02, 0]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[cityConfig.CORRIDOR_HALF * 2 * SC, HALF_Z * 2.4]} />
            <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.06} toneMapped={false} />
          </mesh>

          {animated && (
            <mesh ref={radar} position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.93, 1, 56]} />
              <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.2} toneMapped={false} />
            </mesh>
          )}

          {animated && (
            <group>
              {Array.from({ length: 14 }).map((_, i) => (
                <mesh
                  key={i}
                  position={[0, 0.005, -HALF_Z + ((i + 0.5) / 14) * HALF_Z * 2]}
                  rotation-x={-Math.PI / 2}
                >
                  <planeGeometry args={[HALF_X * 2.1, 0.04]} />
                  <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.07} toneMapped={false} />
                </mesh>
              ))}
              <mesh ref={scan} position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[HALF_X * 2.1, 0.5]} />
                <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.25} toneMapped={false} />
              </mesh>
            </group>
          )}

          <instancedMesh
            ref={padRef}
            args={[undefined, undefined, cityConfig.TOTAL_PLOTS]}
            frustumCulled={false}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial toneMapped={false} />
          </instancedMesh>

          {ownedMini && <OwnedRing x={ownedMini[0]} z={ownedMini[1]} pad={PAD} />}
        </group>
      </group>

      {districts.map((d, i) => {
        const s = stats[d.id] ?? { total: 0, owned: 0, open: 0 }
        const enter = ownedDistrict === d.id
        const can = available(d.id)
        const sub = enter
          ? `ENTER ▸ PLOT #${ownedPlot!.id}`
          : ownedPlot
            ? 'LOCKED'
            : can
              ? `${s.open} OPEN ▸`
              : 'FULL'
        return (
          <Chip
            key={d.id}
            x={(i - 1) * 7}
            label={d.label}
            sub={sub}
            color={d.color}
            active={can}
            hovered={hover === d.id}
            onOver={() => {
              if (can) setHover(d.id)
              setFocus('myplots')
            }}
            onOut={() => {
              setHover((h) => (h === d.id ? null : h))
              setFocus(null)
            }}
            onClick={can ? () => onPick(d.id) : undefined}
          />
        )
      })}
    </group>
  )
}

function OwnedRing({ x, z, pad }: { x: number; z: number; pad: number }) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const s = 1 + Math.sin(t * 2.2) * 0.18
    ring.current?.scale.set(s, s, 1)
    const m = ring.current?.material as THREE.MeshBasicMaterial | undefined
    if (m) m.opacity = 0.6 + Math.abs(Math.sin(t * 2.2)) * 0.4
  })
  return (
    <mesh ref={ring} position={[x, 0.05, z]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[pad * 0.9, pad * 1.25, 24]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.8} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Chip({
  x,
  label,
  sub,
  color,
  active,
  hovered,
  onOver,
  onOut,
  onClick,
}: {
  x: number
  label: string
  sub: string
  color: string
  active: boolean
  hovered: boolean
  onOver: () => void
  onOut: () => void
  onClick?: () => void
}) {
  const rim = active ? color : '#2a2a44'
  const tcol = active ? color : '#45456b'
  return (
    <group
      position={[x, -7.4, 0.2]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (active) {
          onOver()
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onOut()
        document.body.style.cursor = 'auto'
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[6, 2.4]} />
        <meshBasicMaterial color={rim} transparent opacity={hovered ? 0.9 : 0.5} toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[5.8, 2.2]} />
        <meshBasicMaterial color="#05050c" toneMapped={false} />
      </mesh>
      <Text
        font={DISPLAY}
        fontSize={0.58}
        maxWidth={5.4}
        textAlign="center"
        lineHeight={1.05}
        color={tcol}
        anchorX="center"
        anchorY="middle"
        position={[0, 0.5, 0.1]}
        outlineWidth={0.02}
        outlineColor={PALETTE.void}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        font={MONO}
        fontSize={0.48}
        letterSpacing={0.12}
        color={hovered ? '#ffffff' : active ? '#c2c2e2' : '#4a4a6e'}
        anchorX="center"
        anchorY="middle"
        position={[0, -0.65, 0.1]}
      >
        {sub}
      </Text>
    </group>
  )
}
