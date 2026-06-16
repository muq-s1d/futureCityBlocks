import type { ReactNode } from 'react'
import { Text } from '@react-three/drei'
import { PALETTE } from '@/constants/palette'

/**
 * The city storefront: a neon shopfront façade embedded in the ground floor of a
 * dark entrance building. It sits perpendicular to the highway (façade facing the
 * road); after sign-in the camera flies deep into the city then turns ~90° to
 * face it. The plot-type chooser is mounted in-world on the façade via `children`
 * (see StorefrontDashboard) — the façade is the dashboard.
 */

const MONO = '/fonts/ShareTechMono-Regular.ttf'
const DISPLAY = '/fonts/Orbitron.ttf'

export function Storefront({
  position = [-24, 0, -46] as [number, number, number],
  rotationY = Math.PI / 2,
  children,
}: {
  position?: [number, number, number]
  rotationY?: number
  children?: ReactNode
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* Building body */}
      <mesh position={[0, 19, 0]}>
        <boxGeometry args={[30, 38, 24]} />
        <meshStandardMaterial color="#0b0b15" roughness={0.92} metalness={0.08} />
      </mesh>
      {/* Setback upper massing for a little silhouette variety */}
      <mesh position={[0, 41, -3]}>
        <boxGeometry args={[20, 8, 16]} />
        <meshStandardMaterial color="#0c0c18" roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Recessed neon shopfront on the front face */}
      <mesh position={[0, 7, 12.1]}>
        <boxGeometry args={[22, 12, 0.5]} />
        <meshStandardMaterial
          color="#05050c"
          roughness={0.5}
          metalness={0.1}
          emissive={PALETTE.cyan}
          emissiveIntensity={0.05}
        />
      </mesh>
      {/* Neon frame: cyan sides/top, magenta sill */}
      <Frame y={7} w={22} h={12} z={12.45} />

      {/* Marquee */}
      <Text
        font={DISPLAY}
        fontSize={1.5}
        letterSpacing={0.12}
        color={PALETTE.cyan}
        anchorX="center"
        anchorY="middle"
        position={[0, 14.6, 12.3]}
        outlineWidth={0.04}
        outlineColor={PALETTE.void}
      >
        CITY STOREFRONT
      </Text>
      <Text
        font={MONO}
        fontSize={0.62}
        letterSpacing={0.22}
        color={PALETTE.amber}
        anchorX="center"
        anchorY="middle"
        position={[0, 12.4, 12.3]}
      >
        ▸ CLAIM YOUR DISTRICT
      </Text>

      {/* In-world dashboard cards live on the façade (local coords). */}
      {children}
    </group>
  )
}

function Frame({ y, w, h, z }: { y: number; w: number; h: number; z: number }) {
  const t = 0.28
  return (
    <group position={[0, y, z]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, t, 0.2]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[0, -h / 2, 0]}>
        <boxGeometry args={[w, t, 0.2]} />
        <meshBasicMaterial color={PALETTE.magenta} toneMapped={false} />
      </mesh>
      <mesh position={[-w / 2, 0, 0]}>
        <boxGeometry args={[t, h, 0.2]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[w / 2, 0, 0]}>
        <boxGeometry args={[t, h, 0.2]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
    </group>
  )
}
