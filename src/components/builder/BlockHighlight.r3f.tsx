import { forwardRef } from 'react'
import * as THREE from 'three'
import { CELL } from '@/constants/builder'

/**
 * Minecraft-style targeted-cell outline: a dark wireframe sitting just outside
 * the cell surface. depthTest stays ON so edges behind other blocks are hidden
 * (turning it off makes the highlight look offset/doubled).
 */
export const BlockHighlight = forwardRef<THREE.Mesh>(function BlockHighlight(_props, ref) {
  return (
    <mesh ref={ref} visible={false} renderOrder={3}>
      <boxGeometry args={[CELL * 1.02, CELL * 1.02, CELL * 1.02]} />
      <meshBasicMaterial
        color="#000000"
        wireframe
        transparent
        opacity={0.7}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  )
})
