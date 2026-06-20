import { forwardRef } from 'react'
import * as THREE from 'three'
import { CELL } from '@/constants/builder'
import { PALETTE } from '@/constants/palette'

/**
 * Minecraft-style targeted-cell outline: a slightly oversized cyan wireframe box
 * the builder positions (imperatively, via ref) on whichever cell the centre
 * crosshair is pointing at. Hidden when nothing is targeted.
 */
export const BlockHighlight = forwardRef<THREE.Mesh>(function BlockHighlight(_props, ref) {
  return (
    <mesh ref={ref} visible={false} renderOrder={3}>
      <boxGeometry args={[CELL * 1.02, CELL * 1.02, CELL * 1.02]} />
      <meshBasicMaterial color={PALETTE.cyan} wireframe transparent opacity={0.85} toneMapped={false} />
    </mesh>
  )
})
