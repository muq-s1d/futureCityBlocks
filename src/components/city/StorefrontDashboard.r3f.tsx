import { useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { PALETTE } from '@/constants/palette'
import { SHOPFRONT } from '@/constants/shopfront'
import { HoloCityMap } from '@/components/city/HoloCityMap.r3f'
import { useCityStore } from '@/stores/cityStore'
import { useAuthStore } from '@/stores/authStore'
import type { Plot } from '@/types/db'

/**
 * The interactive contents of the storefront's display windows, mounted as a
 * child of the rotated Storefront group (LOCAL coords; façade faces +z). Each
 * display sits DEEP in the window recess (SHOPFRONT.contentZ) behind the glazing,
 * so nothing pokes through the front. Windows: Account terminal · My Plots
 * showroom (claim/enter) · a shuttered "opening soon".
 */

const MONO = '/fonts/ShareTechMono-Regular.ttf'

const { contentZ, sill, head } = SHOPFRONT
const winMidY = (sill + head) / 2

export function StorefrontDashboard({
  ownedPlot,
  onPick,
  onSignOut,
  onRequestDelete,
}: {
  ownedPlot: Plot | null
  onPick: (districtId: string) => void
  onSignOut: () => void
  onRequestDelete: () => void
}) {
  const plots = useCityStore((s) => s.plots)
  const user = useAuthStore((s) => s.user)
  const { account, myplots, soon } = SHOPFRONT.windows

  return (
    <group>
      <group position={[account.x, winMidY, contentZ]}>
        <AccountDisplay
          email={user?.email ?? '—'}
          onSignOut={onSignOut}
          onRequestDelete={onRequestDelete}
        />
      </group>

      <group position={[myplots.x, winMidY, contentZ]}>
        <HoloCityMap ownedPlot={ownedPlot} plots={plots} onPick={onPick} />
      </group>

      <group position={[soon.x, winMidY, contentZ]}>
        <SoonDisplay w={soon.w} />
      </group>
    </group>
  )
}

/** Account window — a wall terminal screen with sign-out / delete controls. */
function AccountDisplay({
  email,
  onSignOut,
  onRequestDelete,
}: {
  email: string
  onSignOut: () => void
  onRequestDelete: () => void
}) {
  return (
    <group>
      {/* Terminal screen */}
      <mesh position={[0, 1, 0]}>
        <planeGeometry args={[10.5, 12]} />
        <meshStandardMaterial
          color="#05050c"
          roughness={0.5}
          metalness={0.2}
          emissive={PALETTE.magenta}
          emissiveIntensity={0.06}
        />
      </mesh>
      <Text
        font={MONO}
        fontSize={0.82}
        letterSpacing={0.16}
        color={PALETTE.cyan}
        anchorX="center"
        anchorY="middle"
        position={[0, 4.6, 0.1]}
      >
        ● TERMINAL ONLINE
      </Text>
      <Text
        font={MONO}
        fontSize={0.74}
        maxWidth={10}
        textAlign="center"
        letterSpacing={0.02}
        color="#eaeaff"
        anchorX="center"
        anchorY="middle"
        position={[0, 1.9, 0.1]}
      >
        {email}
      </Text>

      <TermButton y={-1.6} label="SIGN OUT ▸" color={PALETTE.cyan} onClick={onSignOut} />
      <TermButton y={-3.9} label="DELETE ACCOUNT" color={PALETTE.magenta} onClick={onRequestDelete} />
    </group>
  )
}

/** A flat terminal button: a neon-tinted bar that brightens on hover. */
function TermButton({
  y,
  label,
  color,
  onClick,
}: {
  y: number
  label: string
  color: string
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <group
      position={[0, y, 0.15]}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        setHover(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <mesh>
        <planeGeometry args={[7.8, 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={hover ? 0.26 : 0.08} toneMapped={false} />
      </mesh>
      {/* Hairline rectangular frame (4 thin bars — no diagonal). */}
      <ButtonFrame w={7.8} h={1.5} color={color} opacity={hover ? 0.9 : 0.5} />
      <Text
        font={MONO}
        fontSize={0.5}
        letterSpacing={0.18}
        color={hover ? '#ffffff' : color}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.06]}
      >
        {label}
      </Text>
    </group>
  )
}

/** Four thin bars tracing a rectangle — a clean button outline (no diagonal). */
function ButtonFrame({ w, h, color, opacity }: { w: number; h: number; color: string; opacity: number }) {
  const t = 0.06
  const bar = (args: [number, number], pos: [number, number]) => (
    <mesh position={[pos[0], pos[1], 0.02]}>
      <planeGeometry args={args} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  )
  return (
    <>
      {bar([w, t], [0, h / 2])}
      {bar([w, t], [0, -h / 2])}
      {bar([t, h], [-w / 2, 0])}
      {bar([t, h], [w / 2, 0])}
    </>
  )
}

/** "Opening soon" window — a closed roller shutter with a lock readout. */
function SoonDisplay({ w }: { w: number }) {
  const slats = 9
  return (
    <group>
      {Array.from({ length: slats }).map((_, i) => (
        <mesh key={i} position={[0, 6.5 - i * 1.5, 0]}>
          <boxGeometry args={[w - 1.2, 1.2, 0.2]} />
          <meshStandardMaterial color="#0c0c18" roughness={0.85} metalness={0.25} />
        </mesh>
      ))}
      <Text
        font={MONO}
        fontSize={0.82}
        letterSpacing={0.18}
        color={PALETTE.amber}
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.3]}
        outlineWidth={0.025}
        outlineColor={PALETTE.void}
      >
        ⌧ LOCKED
      </Text>
    </group>
  )
}

