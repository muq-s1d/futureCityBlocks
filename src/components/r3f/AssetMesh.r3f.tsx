import { useMemo } from 'react'
import { VoxelBlocksMesh } from '@/components/r3f/VoxelBlocksMesh.r3f'
import { CELL } from '@/constants/builder'
import type { PlacedAsset } from '@/lib/assets'

/**
 * Read-only render of a placed asset on a plot. Positions the asset at its
 * plot_objects world coords and reuses the shared VoxelBlocksMesh.
 *
 * The asset is centred horizontally on the placement point (its footprint's
 * centre sits at pos), with its lowest blocks resting on the ground (no vertical
 * centring), so placement feels like dropping the structure where you clicked.
 */
export function AssetMesh({ object }: { object: PlacedAsset }) {
  const blocks = object.asset.voxel_data

  const offset = useMemo<[number, number, number]>(() => {
    if (blocks.length === 0) return [0, 0, 0]
    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    for (const b of blocks) {
      if (b.x < minX) minX = b.x
      if (b.x > maxX) maxX = b.x
      if (b.z < minZ) minZ = b.z
      if (b.z > maxZ) maxZ = b.z
    }
    // Centre the footprint on the origin; leave y untouched (rests on ground).
    return [-((minX + maxX + 1) / 2) * CELL, 0, -((minZ + maxZ + 1) / 2) * CELL]
  }, [blocks])

  return (
    <group position={[object.pos_x, object.pos_y, object.pos_z]} rotation-y={object.rot_y}>
      <group position={offset}>
        <VoxelBlocksMesh blocks={blocks} />
      </group>
    </group>
  )
}
