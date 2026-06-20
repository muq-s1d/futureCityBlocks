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

// Absolute ceiling on instances per type = the whole build volume. A real build
// never fills it, so we don't preallocate this much — instead each mesh's
// capacity grows in powers of two (from BASE_CAPACITY) as blocks are added, and
// only re-creates at a power-of-two boundary, capped here.
const HARD_CAP = BUILDER_BOUNDS.w * BUILDER_BOUNDS.d * BUILDER_BOUNDS.h
const BASE_CAPACITY = 256

/** Smallest power-of-two capacity (≥ BASE_CAPACITY, ≤ HARD_CAP) that fits the
 *  largest single-type bucket. */
function capacityFor(byType: VoxelBlock[][]): number {
  let max = 0
  for (const bucket of byType) if (bucket.length > max) max = bucket.length
  let cap = BASE_CAPACITY
  while (cap < max) cap *= 2
  return Math.min(cap, HARD_CAP)
}

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

    // Shared instance capacity for all 7 meshes — grows in power-of-two steps,
    // so it only changes (and re-creates the meshes) on a boundary, not per add.
    const capacity = useMemo(() => capacityFor(byType), [byType])

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
              // Re-key on capacity so a grow cleanly remounts the mesh at the new
              // size and re-runs the ref (which refreshes meshRefs for raycasting).
              key={`${type}:${capacity}`}
              ref={(el) => {
                if (el) meshRefs.current[ti] = el
              }}
              args={[undefined, undefined, capacity]}
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
