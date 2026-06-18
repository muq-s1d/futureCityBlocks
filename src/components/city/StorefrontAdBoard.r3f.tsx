import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { SHOPFRONT } from '@/constants/shopfront'
import { useQualityCaps } from '@/stores/qualityStore'

/**
 * A holographic advertisement board hung in front of the shopfront's right bay
 * (over the "Opening Soon" unit — the least important window — so it never covers
 * the Account terminal or the My Plots map). It is the façade's most legible
 * animated element — yawed to face the front-centre camera, gently bobbing, with a
 * pulsing glow, a sweeping scanline and rotating promo copy. Pure emissive/basic
 * materials (no postprocessing). On low tier it holds a single static card so
 * 60fps is never at risk.
 */

const DISPLAY = '/fonts/Orbitron.ttf'
const MONO = '/fonts/ShareTechMono-Regular.ttf'

const FRONT = SHOPFRONT.front

// Mounted on the fascia band at marquee height, to the RIGHT of the "FUTURE CITY"
// marquee (which is centred and ~±11 wide), so it sits up top without covering it.
// Held in front of the fascia signboard (z 11.2→12.4) and yawed to face the camera.
const AD_X = 22.5
const AD_Y = 22.6
const AD_Z = FRONT + 1.8
const AD_YAW = -0.55

const BW = 6.2 // board width
const BH = 3.8 // board height

// In-world ads in a corporate-dystopian voice, each tied to FutureCity's actual
// fiction — 200 lots across the Neon District, Corporate Zone and Underground.
const ADS: { kicker: string; line1: string; line2: string; color: string }[] = [
  { kicker: '◢ GRIDNET', line1: 'OWN THE GRID', line2: '200 LOTS · 3 ZONES', color: PALETTE.cyan },
  { kicker: '◢ VACANCY', line1: 'NEON DISTRICT', line2: 'LEASE IT NOW ▸', color: PALETTE.magenta },
  { kicker: '◢ SPONSORED', line1: 'BUILD HIGHER', line2: 'GLOW BRIGHTER ▸', color: PALETTE.amber },
  { kicker: '◢ CORP OFFER', line1: 'CORPO ZONE', line2: 'STATUS INCLUDED', color: PALETTE.cyan },
  { kicker: '◢ AFTER DARK', line1: 'UNDERGROUND', line2: 'HIRING DREAMERS', color: PALETTE.magenta },
]

export function StorefrontAdBoard() {
  const animated = useQualityCaps().animatedHolograms
  const [i, setI] = useState(0)
  const ad = ADS[i]!

  // Rotate the promo copy on a timer in every tier (cheap state swap); only the
  // holographic motion below is gated off on low.
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % ADS.length), 3400)
    return () => clearInterval(t)
  }, [])

  const float = useRef<THREE.Group>(null)
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  const scan = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!animated) return
    const t = state.clock.elapsedTime
    if (float.current) float.current.position.y = Math.sin(t * 1.1) * 0.16
    // Pulsing backlight with a faint flicker.
    const flick = 0.9 + 0.1 * Math.sin(t * 33)
    if (glow.current) glow.current.opacity = (0.22 + 0.12 * Math.sin(t * 2.6)) * flick
    // Scanline sweeping down the card face.
    if (scan.current) {
      const s = (t * 0.6) % 1
      scan.current.position.y = BH / 2 - s * BH
      ;(scan.current.material as THREE.MeshBasicMaterial).opacity = Math.sin(s * Math.PI) * 0.35
    }
  })

  return (
    <group position={[AD_X, AD_Y, AD_Z]} rotation-y={AD_YAW}>
      <group ref={float}>
        {/* Dark backing panel. */}
        <mesh>
          <boxGeometry args={[BW, BH, 0.3]} />
          <meshStandardMaterial color="#05050d" roughness={0.5} metalness={0.25} />
        </mesh>
        {/* Pulsing holographic backlight. */}
        <mesh position={[0, 0, 0.18]}>
          <planeGeometry args={[BW - 0.5, BH - 0.5]} />
          <meshBasicMaterial ref={glow} color={ad.color} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
        </mesh>
        {/* Neon edge frame. */}
        <AdFrame w={BW} h={BH} color={ad.color} />
        {/* Sweeping scanline (animated tiers only — a static bar would just sit
            across the card on low). */}
        {animated && (
          <mesh ref={scan} position={[0, 0, 0.22]}>
            <planeGeometry args={[BW - 0.5, 0.28]} />
            <meshBasicMaterial color={ad.color} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
          </mesh>
        )}

        {/* Promo copy. */}
        <Text
          font={MONO}
          fontSize={0.36}
          letterSpacing={0.18}
          maxWidth={BW - 0.6}
          textAlign="center"
          color={ad.color}
          anchorX="center"
          anchorY="middle"
          position={[0, 1.4, 0.25]}
        >
          {ad.kicker}
        </Text>
        <Text
          font={DISPLAY}
          fontSize={0.72}
          letterSpacing={0.04}
          maxWidth={BW - 0.5}
          textAlign="center"
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          position={[0, 0.15, 0.25]}
          outlineWidth={0.04}
          outlineColor={PALETTE.void}
        >
          {ad.line1}
        </Text>
        <Text
          font={MONO}
          fontSize={0.44}
          letterSpacing={0.08}
          maxWidth={BW - 0.6}
          textAlign="center"
          color={ad.color}
          anchorX="center"
          anchorY="middle"
          position={[0, -1.2, 0.25]}
        >
          {ad.line2}
        </Text>
      </group>

      {/* Colour spill onto the frontage + wet floor. */}
      <pointLight position={[0, 0, 4]} color={ad.color} intensity={22} distance={28} decay={2} />
    </group>
  )
}

/** Four thin emissive bars tracing the card edge. */
function AdFrame({ w, h, color }: { w: number; h: number; color: string }) {
  const t = 0.12
  const bar = (args: [number, number, number], pos: [number, number, number]) => (
    <mesh position={pos}>
      <boxGeometry args={args} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
  return (
    <group position={[0, 0, 0.2]}>
      {bar([w, t, 0.12], [0, h / 2, 0])}
      {bar([w, t, 0.12], [0, -h / 2, 0])}
      {bar([t, h, 0.12], [-w / 2, 0, 0])}
      {bar([t, h, 0.12], [w / 2, 0, 0])}
    </group>
  )
}
