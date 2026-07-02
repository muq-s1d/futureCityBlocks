import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { VoxelBlocksMesh } from '@/components/r3f/VoxelBlocksMesh.r3f'
import { CELL } from '@/constants/builder'
import type { Asset } from '@/types/db'

export function AssetGhostPreview({
  asset,
  position,
  rotY,
}: {
  asset: Asset
  position: [number, number, number]
  rotY: number
}) {
  const blocks = asset.voxel_data
  const groupRef = useRef<THREE.Group>(null)

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
    const halfW = Math.floor((maxX - minX + 1) / 2)
    const halfZ = Math.floor((maxZ - minZ + 1) / 2)
    return [(-minX - halfW) * CELL, 0, (-minZ - halfZ) * CELL]
  }, [blocks])

  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.Material
        mat.transparent = true
        mat.opacity = 0.4
        mat.depthWrite = false
      }
    })
  })

  return (
    <group position={position} rotation-y={rotY}>
      <group ref={groupRef} position={offset}>
        <VoxelBlocksMesh blocks={blocks} />
      </group>
    </group>
  )
}
