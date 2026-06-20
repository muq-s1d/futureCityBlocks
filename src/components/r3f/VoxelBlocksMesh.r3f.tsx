import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BLOCK_COLOR, BLOCK_TYPES, BUILDER_BOUNDS, CELL, EMISSIVE_BLOCKS } from '@/constants/builder'
import type { BlockType, VoxelBlock } from '@/types/voxel'

/**
 * Shared voxel renderer: one <instancedMesh> per BlockType (≤7 draw calls for
 * any structure), built from a VoxelBlock[] prop. Used both by the interactive
 * builder (the scratch buffer) and by the read-only placed-asset renderer
 * (AssetMesh) — the one genuinely shared piece of geometry logic, factored once.
 *
 * Each instance sits at its cell CENTRE: local pos = (cell + 0.5) * CELL, so the
 * group's local origin is the structure's min corner (cell 0,0,0's corner) and a
 * y=0 block rests on a baseplate whose top is at y=0.
 *
 * The instanceId→cell map is rebuilt in the SAME effect that fills the matrices
 * (staleness gotcha): after a remove the arrays re-render together, so a raycast
 * hit never mis-attributes to a stale cell. The handle exposes the live mesh list
 * (for the raycaster) and pickCell() to turn a hit back into a grid cell.
 */

export interface VoxelBlocksHandle {
  /** The per-type instanced meshes, for raycasting from the builder. */
  meshes: THREE.InstancedMesh[]
  /** Map a raycast hit (mesh + instanceId) back to its voxel block, or null. */
  pickCell: (mesh: THREE.Object3D, instanceId: number) => VoxelBlock | null
}

// Hard cap on instances per type = the whole build volume. The builder clamps
// placement to BUILDER_BOUNDS, and assets are authored in the builder, so no
// structure can exceed this — capacity stays fixed (no mesh re-creation churn).
const MAX_INSTANCES = BUILDER_BOUNDS.w * BUILDER_BOUNDS.d * BUILDER_BOUNDS.h

export const VoxelBlocksMesh = forwardRef<VoxelBlocksHandle, { blocks: VoxelBlock[] }>(
  function VoxelBlocksMesh({ blocks }, ref) {
    const meshRefs = useRef<THREE.InstancedMesh[]>([])
    // cellMaps[typeIndex][instanceId] = the block at that instance.
    const cellMaps = useRef<VoxelBlock[][]>(BLOCK_TYPES.map(() => []))

    // Bucket blocks by type, preserving BLOCK_TYPES order so type index ↔ mesh
    // index ↔ cellMaps index all line up.
    const byType = useMemo<VoxelBlock[][]>(() => {
      const buckets: VoxelBlock[][] = BLOCK_TYPES.map(() => [])
      for (const b of blocks) {
        const i = BLOCK_TYPES.indexOf(b.type)
        if (i >= 0) buckets[i]!.push(b)
      }
      return buckets
    }, [blocks])

    useLayoutEffect(() => {
      const m = new THREE.Matrix4()
      const color = new THREE.Color()
      byType.forEach((bucket, ti) => {
        const mesh = meshRefs.current[ti]
        if (!mesh) return
        const type = BLOCK_TYPES[ti]!
        const map: VoxelBlock[] = []
        bucket.forEach((b, i) => {
          m.makeTranslation((b.x + 0.5) * CELL, (b.y + 0.5) * CELL, (b.z + 0.5) * CELL)
          mesh.setMatrixAt(i, m)
          color.set(b.color ?? BLOCK_COLOR[type])
          mesh.setColorAt(i, color)
          map[i] = b
        })
        mesh.count = bucket.length
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        cellMaps.current[ti] = map
      })
    }, [byType])

    useImperativeHandle(
      ref,
      () => ({
        meshes: meshRefs.current,
        pickCell: (mesh, instanceId) => {
          const ti = meshRefs.current.indexOf(mesh as THREE.InstancedMesh)
          if (ti < 0) return null
          return cellMaps.current[ti]?.[instanceId] ?? null
        },
      }),
      [],
    )

    return (
      <>
        {BLOCK_TYPES.map((type: BlockType, ti) => {
          const emissive = EMISSIVE_BLOCKS.has(type)
          return (
            <instancedMesh
              key={type}
              ref={(el) => {
                if (el) meshRefs.current[ti] = el
              }}
              args={[undefined, undefined, MAX_INSTANCES]}
              frustumCulled={false}
            >
              <boxGeometry args={[CELL, CELL, CELL]} />
              {emissive ? (
                <meshBasicMaterial toneMapped={false} />
              ) : (
                <meshStandardMaterial roughness={0.7} metalness={0.2} />
              )}
            </instancedMesh>
          )
        })}
      </>
    )
  },
)
