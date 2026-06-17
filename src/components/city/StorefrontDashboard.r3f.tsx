import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { DISTRICTS, districtForColumn } from '@/constants/city'
import { PALETTE } from '@/constants/palette'
import { SHOPFRONT } from '@/constants/shopfront'
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
const DISPLAY = '/fonts/Orbitron.ttf'

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
        <MyPlotsDisplay ownedPlot={ownedPlot} plots={plots} onPick={onPick} />
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

const CARD_W = 6.2
const CARD_H = 10
const CARD_STEP = 7

/** My Plots window — the claim/enter showroom. */
function MyPlotsDisplay({
  ownedPlot,
  plots,
  onPick,
}: {
  ownedPlot: Plot | null
  plots: Plot[]
  onPick: (districtId: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  const openByDistrict = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of plots) {
      if (!p.owner_id) counts[p.district] = (counts[p.district] ?? 0) + 1
    }
    return counts
  }, [plots])

  // Owned: a single "enter your plot" card, centred.
  if (ownedPlot) {
    const d = districtForColumn(ownedPlot.grid_x)
    return (
      <DistrictCard
        position={[0, 0, 0]}
        label={d.label}
        color={d.color}
        available
        subLabel={`PLOT #${ownedPlot.id}`}
        actionLabel="ENTER ▸"
        hovered={hovered === d.id}
        onOver={() => setHovered(d.id)}
        onOut={() => setHovered((h) => (h === d.id ? null : h))}
        onPick={() => onPick(d.id)}
      />
    )
  }

  const startX = -((DISTRICTS.length - 1) / 2) * CARD_STEP
  return (
    <>
      {DISTRICTS.map((d, i) => {
        const open = openByDistrict[d.id] ?? 0
        const available = open > 0
        return (
          <DistrictCard
            key={d.id}
            position={[startX + i * CARD_STEP, 0, 0]}
            label={d.label}
            color={d.color}
            available={available}
            subLabel={available ? `${open} OPEN` : 'FULL'}
            actionLabel="CLAIM ▸"
            hovered={hovered === d.id}
            onOver={() => setHovered(d.id)}
            onOut={() => setHovered((h) => (h === d.id ? null : h))}
            onPick={available ? () => onPick(d.id) : undefined}
          />
        )
      })}
    </>
  )
}

function DistrictCard({
  position,
  label,
  color,
  available,
  subLabel,
  actionLabel,
  hovered,
  onOver,
  onOut,
  onPick,
}: {
  position: [number, number, number]
  label: string
  color: string
  available: boolean
  subLabel: string
  actionLabel: string
  hovered: boolean
  onOver: () => void
  onOut: () => void
  onPick?: () => void
}) {
  const lit = available && hovered
  const rimColor = available ? color : '#2a2a44'
  const textColor = available ? color : '#45456b'

  return (
    <group
      position={position}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        if (available) onOver()
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation()
        onOut()
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation()
        onPick?.()
      }}
    >
      {/* Neon rim (district colour) peeking out behind the dark card face. Kept
          clearly behind the face in z so the two never z-fight. */}
      <mesh position={[0, 0, -0.35]}>
        <boxGeometry args={[CARD_W + 0.3, CARD_H + 0.3, 0.2]} />
        <meshBasicMaterial color={rimColor} toneMapped={false} transparent opacity={lit ? 1 : 0.6} />
      </mesh>
      {/* Dark card face */}
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[CARD_W, CARD_H, 0.3]} />
        <meshStandardMaterial
          color="#06060e"
          roughness={0.6}
          metalness={0.1}
          emissive={available ? color : '#000000'}
          emissiveIntensity={lit ? 0.2 : 0.05}
        />
      </mesh>

      <Text
        font={DISPLAY}
        fontSize={0.9}
        maxWidth={CARD_W - 0.5}
        textAlign="center"
        lineHeight={1.12}
        letterSpacing={0.03}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        position={[0, 1.9, 0.3]}
        outlineWidth={0.025}
        outlineColor={PALETTE.void}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        font={MONO}
        fontSize={0.66}
        letterSpacing={0.14}
        color={available ? '#c2c2e2' : '#4a4a6e'}
        anchorX="center"
        anchorY="middle"
        position={[0, -1.7, 0.3]}
      >
        {subLabel}
      </Text>
      {available && (
        <Text
          font={MONO}
          fontSize={0.58}
          letterSpacing={0.2}
          color={lit ? color : PALETTE.cyan}
          anchorX="center"
          anchorY="middle"
          position={[0, -3.6, 0.3]}
          fillOpacity={lit ? 0.95 : 0.75}
        >
          {actionLabel}
        </Text>
      )}
    </group>
  )
}
