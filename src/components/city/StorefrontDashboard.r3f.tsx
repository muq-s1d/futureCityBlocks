import { useMemo, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { DISTRICTS } from '@/constants/city'
import { PALETTE } from '@/constants/palette'
import { useCityStore } from '@/stores/cityStore'
import type { Plot } from '@/types/db'

/**
 * The "choose your district" chooser, rendered as true in-world 3D cards on the
 * storefront shopfront (mounted as a child of the rotated Storefront group, so
 * these are LOCAL coordinates — the façade faces +z here). Mirrors the AuthKiosk
 * pattern: neon-framed panels with troika Text, hover/click hit-tested in 3D.
 * Picking an available district flies the camera to the user's plot.
 */

const MONO = '/fonts/ShareTechMono-Regular.ttf'
const DISPLAY = '/fonts/Orbitron.ttf'

// Card geometry, in the storefront's local space (front glass ≈ z 12.1).
const CARD_W = 6.2
const CARD_H = 7.4
const CARD_Z = 12.7
const CARD_Y = 6.4
const CARD_GAP = 0.9

export function StorefrontDashboard({
  ownedPlot,
  onPick,
}: {
  ownedPlot: Plot | null
  onPick: () => void
}) {
  const plots = useCityStore((s) => s.plots)
  const [hovered, setHovered] = useState<string | null>(null)

  const openByDistrict = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of plots) {
      if (!p.owner_id) counts[p.district] = (counts[p.district] ?? 0) + 1
    }
    return counts
  }, [plots])

  const step = CARD_W + CARD_GAP
  const startX = -((DISTRICTS.length - 1) / 2) * step

  return (
    <group>
      <Text
        font={MONO}
        fontSize={0.5}
        letterSpacing={0.24}
        color={PALETTE.muted}
        anchorX="center"
        anchorY="middle"
        position={[0, CARD_Y + CARD_H / 2 + 1.1, CARD_Z]}
      >
        {ownedPlot ? `PLOT #${ownedPlot.id} · CHOOSE A DISTRICT` : 'CHOOSE A DISTRICT'}
      </Text>

      {DISTRICTS.map((d, i) => {
        const open = openByDistrict[d.id] ?? 0
        const available = open > 0 || Boolean(ownedPlot)
        return (
          <DistrictCard
            key={d.id}
            x={startX + i * step}
            label={d.label}
            color={d.color}
            open={open}
            available={available}
            hovered={hovered === d.id}
            onOver={() => setHovered(d.id)}
            onOut={() => setHovered((h) => (h === d.id ? null : h))}
            onPick={available ? onPick : undefined}
          />
        )
      })}
    </group>
  )
}

function DistrictCard({
  x,
  label,
  color,
  open,
  available,
  hovered,
  onOver,
  onOut,
  onPick,
}: {
  x: number
  label: string
  color: string
  open: number
  available: boolean
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
      position={[x, CARD_Y, CARD_Z]}
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
      {/* Neon rim (district colour) peeking out behind the dark card face. */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[CARD_W + 0.4, CARD_H + 0.4, 0.2]} />
        <meshBasicMaterial color={rimColor} toneMapped={false} transparent opacity={lit ? 1 : 0.65} />
      </mesh>
      {/* Dark card face */}
      <mesh position={[0, 0, 0.05]}>
        <boxGeometry args={[CARD_W, CARD_H, 0.3]} />
        <meshStandardMaterial
          color="#06060e"
          roughness={0.6}
          metalness={0.1}
          emissive={available ? color : '#000000'}
          emissiveIntensity={lit ? 0.18 : 0.05}
        />
      </mesh>

      <Text
        font={DISPLAY}
        fontSize={0.62}
        maxWidth={CARD_W - 0.8}
        textAlign="center"
        lineHeight={1.15}
        letterSpacing={0.06}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        position={[0, 0.9, 0.3]}
        outlineWidth={0.012}
        outlineColor={PALETTE.void}
      >
        {label.toUpperCase()}
      </Text>
      <Text
        font={MONO}
        fontSize={0.4}
        letterSpacing={0.14}
        color={available ? PALETTE.muted : '#3a3a5c'}
        anchorX="center"
        anchorY="middle"
        position={[0, -1.4, 0.3]}
      >
        {available ? `${open} OPEN` : 'FULL'}
      </Text>
      {available && (
        <Text
          font={MONO}
          fontSize={0.34}
          letterSpacing={0.2}
          color={lit ? color : PALETTE.cyan}
          anchorX="center"
          anchorY="middle"
          position={[0, -2.7, 0.3]}
          fillOpacity={lit ? 1 : 0.6}
        >
          CLAIM ▸
        </Text>
      )}
    </group>
  )
}
