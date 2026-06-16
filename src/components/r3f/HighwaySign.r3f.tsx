import { useMemo } from 'react'
import { PALETTE } from '@/constants/palette'

/**
 * The approach highway that LEADS to the city. The road runs along x=0 through
 * the open ground in FRONT of the city (positive z), so the skyline sits ahead
 * down the road (the city begins near z=0 and recedes — see CityField). The
 * interactive sign-up / log-in sign is the 3D AuthKiosk planted on the shoulder.
 */

const ROAD_HALF = 7
const ROAD_NEAR = 104 // road starts out near the camera…
const ROAD_FAR = 2 // …and runs up to the city edge

export function HighwaySign() {
  const roadLen = ROAD_NEAR - ROAD_FAR
  const roadMid = (ROAD_NEAR + ROAD_FAR) / 2

  // Dashed centre line down the highway.
  const dashes = useMemo(() => {
    const out: number[] = []
    for (let z = ROAD_NEAR - 6; z > ROAD_FAR; z -= 7) out.push(z)
    return out
  }, [])

  return (
    <group>
      {/* ── Highway surface ── */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, roadMid]}>
        <planeGeometry args={[ROAD_HALF * 2, roadLen]} />
        <meshStandardMaterial color="#08080e" roughness={1} metalness={0.05} />
      </mesh>

      {/* Centre dashes (amber) */}
      {dashes.map((z) => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[0.4, 0.04, 3]} />
          <meshBasicMaterial color={PALETTE.amber} toneMapped={false} />
        </mesh>
      ))}

      {/* Edge guide lines — cyan left, magenta right — funnel the eye to the city */}
      <mesh position={[-ROAD_HALF + 0.35, 0.14, roadMid]}>
        <boxGeometry args={[0.16, 0.06, roadLen]} />
        <meshBasicMaterial color={PALETTE.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[ROAD_HALF - 0.35, 0.14, roadMid]}>
        <boxGeometry args={[0.16, 0.06, roadLen]} />
        <meshBasicMaterial color={PALETTE.magenta} toneMapped={false} />
      </mesh>
    </group>
  )
}
