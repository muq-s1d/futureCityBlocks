import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY_CONFIG } from '@/constants/city'
import { PALETTE } from '@/constants/palette'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import type { Plot } from '@/types/db'

/**
 * Ground picker for placing a saved asset onto the owned plot — mounted only
 * while a placement is armed (PlotHud "place" mode). Reuses PlotField's
 * hover/click raycast pattern, but against a single plane sized to one lot. Hover
 * shows a cyan marker; click reports the world (x, z) up to the placement flow.
 */
export function PlotGroundPicker({ plot, onPick }: { plot: Plot; onPick: (x: number, z: number) => void }) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const { cx, cz } = useMemo(
    () => ({ cx: plotWorldX(plot.grid_x), cz: plotWorldZ(plot.grid_z) }),
    [plot.grid_x, plot.grid_z],
  )
  const SIZE = CITY_CONFIG.LOT

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[cx, 0.4, cz]}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHover([e.point.x, e.point.z])
        }}
        onPointerOut={() => setHover(null)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onPick(e.point.x, e.point.z)
        }}
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshBasicMaterial
          color={PALETTE.cyan}
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {hover && (
        <mesh position={[hover[0], 0.5, hover[1]]} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.8, 1.2, 24]} />
          <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
