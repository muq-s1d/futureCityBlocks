import type { ReactNode } from 'react'
import { forwardRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { SHOPFRONT } from '@/constants/shopfront'
import { StorefrontSignage } from '@/components/city/StorefrontSignage.r3f'
import { StorefrontAdBoard } from '@/components/city/StorefrontAdBoard.r3f'
import { useStorefrontStore, type WindowId } from '@/stores/storefrontStore'

/**
 * The city storefront: a real recessed shopfront in the ground floor of a dark
 * entrance building, perpendicular to the highway (façade facing the road). After
 * sign-in the camera flies deep into the city then turns ~90° to face it.
 *
 * Anatomy (local space; +z is the street/front):
 *   - upper building massing sits at the front plane (z = FRONT)
 *   - the ground floor is RECESSED back to BACK_Z, framed by solid piers, a
 *     stallriser and a fascia, with a projecting canopy — so it reads as a shop
 *   - three glazed display windows (Account · My Plots · Coming soon); their
 *     interactive contents are mounted DEEP in the recess via `children`, so
 *     nothing pokes through the glass.
 * Emissive fascia tube + signage are real light shapes the wet floor reflects.
 */

const MONO = '/fonts/ShareTechMono-Regular.ttf'
const DISPLAY = '/fonts/Orbitron.ttf'

const W = SHOPFRONT.width
const FRONT = SHOPFRONT.front
const { backZ, sill, head, fascia } = SHOPFRONT
const winMidY = (sill + head) / 2

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
      {/* Solid building mass BEHIND the recess (its front face = the back wall you
          see through the windows). */}
      <mesh position={[0, head / 2, (backZ - 12) / 2]}>
        <boxGeometry args={[W, head, 12 + backZ]} />
        <meshStandardMaterial color="#0a0a14" roughness={0.95} metalness={0.06} />
      </mesh>
      {/* Upper massing above the shopfront, at the front plane. */}
      <mesh position={[0, (fascia + 34) / 2, 0]}>
        <boxGeometry args={[W, 34 - fascia, 24]} />
        <meshStandardMaterial color="#0b0b15" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh position={[0, 36, -3]}>
        <boxGeometry args={[W * 0.5, 8, 16]} />
        <meshStandardMaterial color="#0c0c18" roughness={0.92} metalness={0.08} />
      </mesh>

      {/* Fascia signboard band (between window head and upper massing). */}
      <mesh position={[0, (head + fascia) / 2, FRONT - 0.2]}>
        <boxGeometry args={[W, fascia - head, 1.2]} />
        <meshStandardMaterial color="#08080f" roughness={0.8} metalness={0.15} />
      </mesh>
      {/* Bright neon under-fascia tube — a strong horizontal light line the wet
          floor reflects. */}
      <mesh position={[0, head - 0.1, FRONT + 0.35]}>
        <boxGeometry args={[W - 1.5, 0.3, 0.3]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
      {/* Stallriser (solid base under the glazing). */}
      <mesh position={[0, sill / 2, FRONT - 0.3]}>
        <boxGeometry args={[W, sill, 1.4]} />
        <meshStandardMaterial color="#070710" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Solid piers framing the windows (front plane → into the recess). */}
      <Pier x={-29} w={2.4} />
      <Pier x={-11} w={2.4} />
      <Pier x={17} w={2.4} />
      <Pier x={29} w={2.4} />

      {/* Projecting canopy over the shopfront. */}
      <mesh position={[0, head + 0.4, FRONT + 1.8]} rotation-x={-0.12}>
        <boxGeometry args={[W, 0.5, 4.5]} />
        <meshStandardMaterial color="#0c0c16" roughness={0.85} metalness={0.12} />
      </mesh>
      {/* Magenta downlight strip on the canopy underside. */}
      <mesh position={[0, head + 0.1, FRONT + 3.6]}>
        <boxGeometry args={[W - 4, 0.18, 0.18]} />
        <meshBasicMaterial color={PALETTE.magenta} toneMapped={false} />
      </mesh>

      {/* Cool fill wash over the fascia + upper massing (everything above the
          windows is otherwise unlit). */}
      <pointLight position={[0, 25, 16]} color="#7fbfff" intensity={22} distance={48} decay={2} />

      {/* Per-window glazing + section sign. */}
      {(
        Object.entries(SHOPFRONT.windows) as [
          keyof typeof SHOPFRONT.windows,
          (typeof SHOPFRONT.windows)[keyof typeof SHOPFRONT.windows],
        ][]
      ).map(([id, win]) => (
        <Window key={id} id={id} x={win.x} w={win.w} accent={win.accent} label={SECTION_LABEL[id]} />
      ))}

      {/* Headline blade + reflection-feeding neon shapes. */}
      <StorefrontSignage />

      {/* Animated holographic advertisement board over the left pier. */}
      <StorefrontAdBoard />

      {/* Marquee on the fascia */}
      <Text
        font={DISPLAY}
        fontSize={2.4}
        letterSpacing={0.16}
        color={PALETTE.cyan}
        anchorX="center"
        anchorY="middle"
        position={[0, (head + fascia) / 2 + 0.6, FRONT + 0.5]}
        outlineWidth={0.05}
        outlineColor={PALETTE.void}
      >
        FUTURE CITY
      </Text>
      <Text
        font={MONO}
        fontSize={1.0}
        letterSpacing={0.3}
        color={PALETTE.amber}
        anchorX="center"
        anchorY="middle"
        position={[0, head + 1.0, FRONT + 0.5]}
      >
        ▸ WELCOME BACK TO THE GRID
      </Text>

      {/* Interactive window displays (mounted deep in the recess). */}
      {children}
    </group>
  )
}

const SECTION_LABEL: Record<keyof typeof SHOPFRONT.windows, string> = {
  account: 'ACCOUNT',
  myplots: 'MY PLOTS',
  soon: 'OPENING SOON',
}

/** A solid vertical pier between/around the display windows. */
function Pier({ x, w }: { x: number; w: number }) {
  return (
    <mesh position={[x, (sill + head) / 2, FRONT - 1]}>
      <boxGeometry args={[w, head - sill, 6]} />
      <meshStandardMaterial color="#0a0a14" roughness={0.9} metalness={0.12} />
    </mesh>
  )
}

/** One display window: a recessed reveal, faint glazing, a neon mullion frame and
 *  an etched section sign on the transom. Contents come from the dashboard.
 *  Engaging a window (storefrontStore.focus) brightens it and dims the others —
 *  the highlight eases each frame through refs, so no re-render. */
function Window({ id, x, w, accent, label }: { id: WindowId; x: number; w: number; accent: string; label: string }) {
  const h = head - sill
  const focus = useStorefrontStore((s) => s.focus)

  // Target highlight multiplier: this window picked → bright, another picked → dim.
  const target = focus === id ? 1.7 : focus ? 0.32 : 1

  const lightRef = useRef<THREE.PointLight>(null)
  const tintRef = useRef<THREE.MeshBasicMaterial>(null)
  const frameRef = useRef<THREE.Group>(null)
  const mult = useRef(1)
  useFrame((_, dt) => {
    mult.current += (target - mult.current) * (1 - Math.exp(-6 * dt))
    const m = mult.current
    if (lightRef.current) lightRef.current.intensity = 48 * m
    if (tintRef.current) tintRef.current.opacity = 0.12 * Math.min(m, 1.8)
    const frameOpacity = THREE.MathUtils.clamp(0.85 * (m < 1 ? m + 0.2 : Math.min(m, 1.25)), 0.25, 1)
    if (frameRef.current) {
      for (const bar of frameRef.current.children) {
        ;((bar as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = frameOpacity
      }
    }
  })

  return (
    <group position={[x, winMidY, 0]}>
      {/* Even interior tint on the back wall — a flat soft colour so the recess
          reads as a lit interior, with no hotspot. Held off the solid wall so it
          doesn't z-fight it. */}
      <mesh position={[0, 0, backZ + 0.4]}>
        <planeGeometry args={[w - 0.4, h - 0.4]} />
        <meshBasicMaterial ref={tintRef} color={accent} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Soft frontal wash — placed well in front of the glass so its falloff is
          gentle across the whole window (an even glow, not a blob). Reads as the
          shop's light spilling onto the frontage. */}
      <pointLight ref={lightRef} position={[0, 1, FRONT + 8]} color={accent} intensity={48} distance={60} decay={2} />
      {/* Faint tinted glass. */}
      <mesh position={[0, 0, SHOPFRONT.glassZ]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={accent} transparent opacity={0.05} depthWrite={false} />
      </mesh>
      {/* Neon mullion frame around the opening (flush with the front). */}
      <WindowFrame ref={frameRef} w={w} h={h} z={FRONT - 0.05} color={accent} />
      {/* Section sign on the transom bar. */}
      <mesh position={[0, h / 2 + 0.2, FRONT - 0.1]}>
        <boxGeometry args={[w, 0.9, 0.5]} />
        <meshStandardMaterial color="#06060e" roughness={0.7} metalness={0.2} />
      </mesh>
      <Text
        font={MONO}
        fontSize={0.92}
        letterSpacing={0.26}
        color={accent}
        anchorX="center"
        anchorY="middle"
        position={[0, h / 2 + 0.3, FRONT + 0.2]}
        outlineWidth={0.02}
        outlineColor={PALETTE.void}
      >
        {label}
      </Text>
    </group>
  )
}

const WindowFrame = forwardRef<THREE.Group, { w: number; h: number; z: number; color: string }>(
  function WindowFrame({ w, h, z, color }, ref) {
    const t = 0.14
    const bar = (args: [number, number, number], pos: [number, number, number]) => (
      <mesh position={pos}>
        <boxGeometry args={args} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    )
    return (
      <group ref={ref} position={[0, 0, z]}>
        {bar([w, t, 0.15], [0, h / 2, 0])}
        {bar([w, t, 0.15], [0, -h / 2, 0])}
        {bar([t, h, 0.15], [-w / 2, 0, 0])}
        {bar([t, h, 0.15], [w / 2, 0, 0])}
      </group>
    )
  },
)
