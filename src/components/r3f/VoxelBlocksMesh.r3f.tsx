import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BLOCK_COLOR, BLOCK_TYPES, EMISSIVE_BLOCKS } from '@/constants/builder'
import { buildMeshData } from '@/lib/greedyMesh'
import type { BlockType, VoxelBlock } from '@/types/voxel'

export interface VoxelBlocksHandle {
  meshes: THREE.Mesh[]
  pickCell: (hit: THREE.Intersection) => VoxelBlock | null
}

export const VoxelBlocksMesh = forwardRef<VoxelBlocksHandle, { blocks: VoxelBlock[] }>(
  function VoxelBlocksMesh({ blocks }, ref) {
    const meshRefs = useRef<THREE.Mesh[]>([])

    const meshData = useMemo(() => buildMeshData(blocks, BLOCK_TYPES, BLOCK_COLOR), [blocks])

    useLayoutEffect(() => {
      BLOCK_TYPES.forEach((type, ti) => {
        const mesh = meshRefs.current[ti]
        if (!mesh) return
        const data = meshData.get(type)
        if (!data || data.positions.length === 0) {
          mesh.geometry.setIndex(null)
          mesh.geometry.deleteAttribute('position')
          mesh.geometry.deleteAttribute('normal')
          mesh.geometry.deleteAttribute('color')
          mesh.visible = false
          return
        }

        const geo = mesh.geometry
        geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
        geo.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3))
        geo.setIndex(new THREE.BufferAttribute(data.indices, 1))

        if (data.vertexColors) {
          geo.setAttribute('color', new THREE.BufferAttribute(data.vertexColors, 3))
          const mat = mesh.material as THREE.Material & { vertexColors?: boolean }
          mat.vertexColors = true
          mat.needsUpdate = true
        } else {
          geo.deleteAttribute('color')
          const mat = mesh.material as THREE.Material & { vertexColors?: boolean; color?: THREE.Color }
          if (mat.vertexColors) {
            mat.vertexColors = false
            mat.needsUpdate = true
          }
          mat.color?.set(BLOCK_COLOR[type])
        }

        geo.computeBoundingSphere()
        mesh.visible = true
      })
    }, [meshData])

    useImperativeHandle(
      ref,
      () => ({
        meshes: meshRefs.current,
        pickCell: (intersection) => {
          const ti = meshRefs.current.indexOf(intersection.object as THREE.Mesh)
          if (ti < 0) return null
          const type = BLOCK_TYPES[ti]
          if (!type) return null

          const n = intersection.face?.normal
          if (!n || !intersection.point) return null

          // intersection.point is in world space; convert to local (group) space
          const local = intersection.object.worldToLocal(intersection.point.clone())

          // Step half a unit inward along the normal to land inside the source
          // cell, then floor to get cell coordinates.
          const cx = Math.floor(local.x - n.x * 0.5)
          const cy = Math.floor(local.y - n.y * 0.5)
          const cz = Math.floor(local.z - n.z * 0.5)

          return { x: cx, y: cy, z: cz, type }
        },
      }),
      [],
    )

    return (
      <>
        {BLOCK_TYPES.map((type: BlockType, ti) => {
          const emissive = EMISSIVE_BLOCKS.has(type)
          return (
            <mesh
              key={type}
              ref={(el) => {
                if (el) meshRefs.current[ti] = el
              }}
              frustumCulled={false}
            >
              <bufferGeometry />
              {emissive ? (
                <meshBasicMaterial color={BLOCK_COLOR[type]} toneMapped={false} />
              ) : (
                <meshStandardMaterial
                  color={BLOCK_COLOR[type]}
                  roughness={0.7}
                  metalness={0.2}
                />
              )}
            </mesh>
          )
        })}
      </>
    )
  },
)
