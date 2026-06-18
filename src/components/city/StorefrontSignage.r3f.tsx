import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { SHOPFRONT } from '@/constants/shopfront'
import { useQualityCaps } from '@/stores/qualityStore'

/**
 * Storefront signage (storefront-LOCAL space; +z is the street/front). Two jobs:
 *
 *   1. A vertical neon blade reading BUILD THE FUTURE, mounted on the pier between
 *      the Account and My Plots windows and yawed to face the (front-centre)
 *      camera, so it reads head-on instead of edge-on at a frame corner. Its
 *      glyphs cycle through the palette so colour flows down the sign; the tubes
 *      flicker like real neon.
 *   2. Bold, low-reaching emissive light SHAPES (the blade's tubes + a cyan ground
 *      line along the frontage) so the wet MeshReflectorMaterial floor mirrors
 *      actual neon geometry, not just the point-light pools it caught before.
 *
 * All neon is meshBasicMaterial toneMapped={false} (no postprocessing — that
 * caused the blank-canvas bug). Animation drives shared material opacity + glyph
 * visibility/colour through refs/light state, never re-rendering the whole tree.
 */

const DISPLAY = '/fonts/Orbitron.ttf'

const W = SHOPFRONT.width
const FRONT = SHOPFRONT.front

// Vertical blade just LEFT of the Account window (its left edge is x=−26), on the
// left corner pier (x=−29). It must sit well IN FRONT of the pier (a solid box
// spanning z 8→14) or the pier occludes it.
const BLADE_X = -28
const BLADE_Z = FRONT + 4 // projects onto the pavement, clear of the pier face (z=14)
const BLADE_YAW = 0.3 // turn the blade to face the front-centre camera
const BLADE_TOP = 18
const BLADE_BOTTOM = 5
const BLADE_H = BLADE_TOP - BLADE_BOTTOM
const BLADE_MID = (BLADE_TOP + BLADE_BOTTOM) / 2

const SIGN = 'BUILD THE FUTURE'
const COLORS = [PALETTE.cyan, PALETTE.magenta, PALETTE.amber]

export function StorefrontSignage() {
  const animated = useQualityCaps().animatedHolograms
  const [shift, setShift] = useState(0)

  // Flow the colours down the sign (animated tiers only — otherwise a static, but
  // still multi-colour, pattern).
  useEffect(() => {
    if (!animated) return
    const t = setInterval(() => setShift((s) => s + 1), 650)
    return () => clearInterval(t)
  }, [animated])

  // Bright tubes share one flicker level, driven onto each material via a group ref
  // (mutating a hook-memoised material is disallowed by lint).
  const tubes = useRef<THREE.Group>(null)
  const letters = useRef<THREE.Group>(null)

  useFrame((state) => {
    let level = 1
    if (animated) {
      const t = state.clock.elapsedTime
      const hum = 0.86 + 0.14 * Math.sin(t * 47)
      const dip = Math.sin(t * 3.3) + Math.sin(t * 9.1) + Math.sin(t * 17.7)
      const out = dip > 2.4 ? 0.2 : 1 // rare deep flicker
      level = hum * out
    }
    if (tubes.current) {
      for (const tube of tubes.current.children) {
        ;((tube as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = level
      }
    }
    if (letters.current) letters.current.visible = level > 0.45
  })

  // Stack the phrase top→bottom, one glyph per row (spaces become gaps).
  const step = BLADE_H / (SIGN.length - 1)
  const glyphs = useMemo(
    () => SIGN.split('').map((ch, i) => ({ ch, y: BLADE_TOP - i * step })),
    [step],
  )

  return (
    <group>
      {/* ── Vertical blade sign ─────────────────────────────────────────────── */}
      {/* Pivot the yaw about the blade's own centre (x,z), so turning it to face the
          camera spins it in place rather than swinging it sideways into the map. */}
      <group position={[BLADE_X, 0, BLADE_Z]} rotation-y={BLADE_YAW}>
        {/* Dark backing panel. */}
        <mesh position={[0, BLADE_MID, -0.15]}>
          <boxGeometry args={[2.0, BLADE_H + 1.4, 0.4]} />
          <meshStandardMaterial color="#06030c" roughness={0.65} metalness={0.25} />
        </mesh>
        {/* Bright neon edge tubes (the shapes the wet floor reflects), flickered
            together via the group ref. Each edge a different palette colour. */}
        <group ref={tubes}>
          <mesh position={[-0.9, BLADE_MID, 0]}>
            <boxGeometry args={[0.16, BLADE_H + 1, 0.16]} />
            <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} transparent />
          </mesh>
          <mesh position={[0.9, BLADE_MID, 0]}>
            <boxGeometry args={[0.16, BLADE_H + 1, 0.16]} />
            <meshBasicMaterial color={PALETTE.magenta} toneMapped={false} transparent />
          </mesh>
          <mesh position={[0, BLADE_TOP + 0.5, 0]}>
            <boxGeometry args={[2.0, 0.16, 0.16]} />
            <meshBasicMaterial color={PALETTE.amber} toneMapped={false} transparent />
          </mesh>
          <mesh position={[0, BLADE_BOTTOM - 0.5, 0]}>
            <boxGeometry args={[2.0, 0.16, 0.16]} />
            <meshBasicMaterial color={PALETTE.amber} toneMapped={false} transparent />
          </mesh>
        </group>
        {/* Stacked glyphs, colours flowing down the column. */}
        <group ref={letters}>
          {glyphs.map(({ ch, y }, i) =>
            ch === ' ' ? null : (
              <Text
                key={i}
                font={DISPLAY}
                fontSize={0.74}
                color={COLORS[(i + shift) % COLORS.length]}
                anchorX="center"
                anchorY="middle"
                position={[0, y, 0.18]}
                outlineWidth={0.03}
                outlineColor={PALETTE.void}
              >
                {ch}
              </Text>
            ),
          )}
        </group>
        {/* Cool spill so the blade casts onto the pier + wet floor. */}
        <pointLight position={[0, BLADE_MID, 3]} color={PALETTE.cyan} intensity={20} distance={30} decay={2} />
      </group>

      {/* ── Frontage ground line ────────────────────────────────────────────── */}
      {/* A thin bright cyan strip along the base of the shopfront, just above the
          wet slab — reads as the shop's light catching the kerb and gives the floor
          a long horizontal neon reflection. */}
      <mesh position={[0, 0.35, FRONT + 0.25]}>
        <boxGeometry args={[W - 2, 0.16, 0.16]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
    </group>
  )
}
