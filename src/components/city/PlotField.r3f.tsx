import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { districtForColumn } from '@/lib/cityGrid'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { useWorldConfigStore } from '@/stores/worldConfigStore'
import type { Plot } from '@/types/db'

/**
 * The claimable plots, drawn as two InstancedMeshes (two draw calls for all 200):
 *   1. a bright district-coloured base pad, and
 *   2. a slightly smaller dark fill on top — so only a thin neon RIM shows around
 *      each tile (outline, not a full glow).
 * Plots are AXIS-ALIGNED and placed exactly on the lot-and-block grid (see
 * cityGrid) so the field reads as real city blocks with streets and alleys, not
 * a random scatter. Claimed plots glow brighter than unclaimed.
 *
 * frustumCulled is off because an InstancedMesh culls on its (origin, unit) bounds
 * and would otherwise vanish when the camera zooms past that point.
 */

const RIM = 0.55
const dummy = new THREE.Object3D()
const tmpColor = new THREE.Color()
const DARK = new THREE.Color('#070710')

/** Axis-aligned world rect (e.g. the storefront footprint) to leave clear of plots. */
export interface ReserveRect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export function PlotField({
  plots,
  ownedPlotId = null,
  reserve,
  hideBeacon = false,
  onHover,
  onSelect,
}: {
  plots: Plot[]
  ownedPlotId?: number | null
  reserve?: ReserveRect
  hideBeacon?: boolean
  onHover?: (plot: Plot | null) => void
  onSelect?: (plot: Plot) => void
}) {
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)
  const districts = useWorldConfigStore((s) => s.districts)
  const TILE = cityConfig.LOT

  const baseRef = useRef<THREE.InstancedMesh>(null!)
  const fillRef = useRef<THREE.InstancedMesh>(null!)
  const beaconRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState<number | null>(null)

  const visible = useMemo(() => {
    if (!reserve) return plots
    return plots.filter((p) => {
      const x = plotWorldX(p.grid_x, cityConfig)
      const z = plotWorldZ(p.grid_z, cityConfig)
      return !(x >= reserve.minX && x <= reserve.maxX && z >= reserve.minZ && z <= reserve.maxZ)
    })
  }, [plots, reserve, cityConfig])

  useLayoutEffect(() => {
    const base = baseRef.current
    const fill = fillRef.current
    visible.forEach((p, i) => {
      const x = plotWorldX(p.grid_x, cityConfig)
      const z = plotWorldZ(p.grid_z, cityConfig)
      const claimed = Boolean(p.owner_id)

      dummy.position.set(x, 0.12, z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(TILE + RIM, 1, TILE + RIM)
      dummy.updateMatrix()
      base.setMatrixAt(i, dummy.matrix)
      tmpColor.set(districtForColumn(p.grid_x, districts).color).multiplyScalar(claimed ? 0.9 : 0.4)
      base.setColorAt(i, tmpColor)

      dummy.position.set(x, 0.28, z)
      dummy.scale.set(TILE, 1, TILE)
      dummy.updateMatrix()
      fill.setMatrixAt(i, dummy.matrix)
      tmpColor.copy(DARK).lerp(new THREE.Color(districtForColumn(p.grid_x, districts).color), claimed ? 0.12 : 0.04)
      fill.setColorAt(i, tmpColor)
    })
    base.count = visible.length
    fill.count = visible.length
    base.instanceMatrix.needsUpdate = true
    fill.instanceMatrix.needsUpdate = true
    if (base.instanceColor) base.instanceColor.needsUpdate = true
    if (fill.instanceColor) fill.instanceColor.needsUpdate = true
  }, [visible, cityConfig, districts, TILE])

  const owned = useMemo(
    () => visible.find((p) => p.id === ownedPlotId) ?? null,
    [visible, ownedPlotId],
  )

  const hoveredPos = useMemo(() => {
    if (hovered == null) return null
    const p = visible[hovered]
    if (!p) return null
    return [plotWorldX(p.grid_x, cityConfig), 0.3, plotWorldZ(p.grid_z, cityConfig)] as const
  }, [hovered, visible, cityConfig])

  useFrame(({ clock }) => {
    if (!beaconRef.current) return
    const t = clock.getElapsedTime()
    const s = 1 + Math.sin(t * 2.4) * 0.12
    beaconRef.current.scale.set(s, 1, s)
    const mat = beaconRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.26 + (Math.sin(t * 2.4) + 1) * 0.1
  })

  const setHover = (index: number | null) => {
    setHovered(index)
    onHover?.(index == null ? null : (visible[index] ?? null))
  }

  return (
    <group>
      <instancedMesh
        ref={baseRef}
        args={[undefined, undefined, cityConfig.TOTAL_PLOTS]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 0.2, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={fillRef}
        args={[undefined, undefined, cityConfig.TOTAL_PLOTS]}
        frustumCulled={false}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          if (e.instanceId != null && e.instanceId !== hovered) setHover(e.instanceId)
        }}
        onPointerOut={() => setHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          const p = e.instanceId != null ? visible[e.instanceId] : null
          if (p) onSelect?.(p)
        }}
      >
        <boxGeometry args={[1, 0.5, 1]} />
        <meshStandardMaterial roughness={0.85} metalness={0.1} />
      </instancedMesh>

      {hoveredPos && (
        <mesh position={hoveredPos as unknown as THREE.Vector3} renderOrder={2}>
          <boxGeometry args={[TILE + 1, 1.1, TILE + 1]} />
          <meshBasicMaterial color={PALETTE.cyan} wireframe transparent opacity={0.8} toneMapped={false} />
        </mesh>
      )}

      {owned && !hideBeacon && (
        <group>
          <mesh ref={beaconRef} position={[plotWorldX(owned.grid_x, cityConfig), 16, plotWorldZ(owned.grid_z, cityConfig)]}>
            <cylinderGeometry args={[1.3, 0.4, 32, 12, 1, true]} />
            <meshBasicMaterial
              color={PALETTE.cyan}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh
            position={[plotWorldX(owned.grid_x, cityConfig), 0.6, plotWorldZ(owned.grid_z, cityConfig)]}
            renderOrder={2}
          >
            <boxGeometry args={[TILE + 0.8, 1.2, TILE + 0.8]} />
            <meshBasicMaterial color={PALETTE.cyan} wireframe transparent opacity={0.55} toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  )
}
