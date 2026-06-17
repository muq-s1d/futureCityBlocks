import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { useQualityCaps } from '@/stores/qualityStore'

/**
 * The premium "wet night market" ground + air in front of the storefront: a
 * reflective pavement slab that catches the neon, plus slow rising steam. Both
 * scale with the quality tier — on low-end the floor is a plain glossy slab and
 * steam is skipped, so 60fps holds. Placed in storefront-local space (the parent
 * group positions/rotates it onto the façade approach).
 */

const FLOOR_W = 64
const FLOOR_D = 70

/** One soft additive puff texture, generated once and shared by every steamlet. */
function usePuffTexture(): THREE.Texture {
  return useMemo(() => {
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.25)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

interface Puff {
  x: number
  z: number
  base: number // ground offset where it spawns
  speed: number
  phase: number
  scale: number
  tint: THREE.Color
}

function Steam({ count }: { count: number }) {
  const tex = usePuffTexture()
  const group = useRef<THREE.Group>(null!)
  // Mutable per-frame pool lives in a ref (built in an effect, where RNG is OK),
  // mirroring Rain.r3f — never a hook-memoised value, which must stay immutable.
  const pool = useRef<Puff[]>([])

  useLayoutEffect(() => {
    const cyan = new THREE.Color(PALETTE.cyan)
    const magenta = new THREE.Color(PALETTE.magenta)
    const arr: Puff[] = []
    for (let i = 0; i < count; i++) {
      const p: Puff = {
        x: (Math.random() - 0.5) * FLOOR_W * 0.7,
        z: 6 + Math.random() * (FLOOR_D * 0.4),
        base: Math.random() * 8,
        speed: 0.6 + Math.random() * 0.7,
        phase: Math.random(),
        scale: 6 + Math.random() * 7,
        tint: Math.random() > 0.5 ? cyan.clone() : magenta.clone(),
      }
      arr.push(p)
      const sprite = group.current?.children[i] as THREE.Sprite | undefined
      if (sprite) (sprite.material as THREE.SpriteMaterial).color.copy(p.tint)
    }
    pool.current = arr
  }, [count])

  useFrame((_, dt) => {
    const g = group.current
    const puffs = pool.current
    if (!g) return
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i]!
      p.phase = (p.phase + dt * p.speed * 0.06) % 1
      const sprite = g.children[i] as THREE.Sprite | undefined
      if (!sprite) continue
      sprite.position.set(p.x, p.base + p.phase * 22, p.z)
      const s = p.scale * (0.6 + p.phase * 0.9)
      sprite.scale.set(s, s, s)
      // Fade in then out across the rise.
      ;(sprite.material as THREE.SpriteMaterial).opacity = Math.sin(p.phase * Math.PI) * 0.32
    }
  })

  return (
    <group ref={group}>
      {Array.from({ length: count }).map((_, i) => (
        <sprite key={i}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}

export function StorefrontAtmosphere() {
  const caps = useQualityCaps()

  return (
    <group>
      {/* Wet pavement slab, just in front of the façade (local +z is the street).
          Lifted clear of the world void-ground plane (y=0) to avoid z-fighting. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.08, FLOOR_D / 2 - 4]} receiveShadow>
        <planeGeometry args={[FLOOR_W, FLOOR_D]} />
        {caps.reflectiveFloor ? (
          <MeshReflectorMaterial
            resolution={caps.reflectorRes}
            mixBlur={1}
            mixStrength={2.2}
            blur={[300, 80]}
            mirror={0.85}
            depthScale={0.6}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.2}
            roughness={0.6}
            metalness={0.7}
            color="#0a0a16"
          />
        ) : (
          <meshStandardMaterial color="#0a0a16" roughness={0.95} metalness={0.2} />
        )}
      </mesh>

      {/* Neon spill — colored light pooling on the wet street so the floor and its
          reflections actually read at night (otherwise it just mirrors the void). */}
      <pointLight position={[-8, 3, 16]} color={PALETTE.cyan} intensity={60} distance={46} decay={2} />
      <pointLight position={[9, 3, 14]} color={PALETTE.magenta} intensity={55} distance={42} decay={2} />
      <pointLight position={[0, 2.5, 30]} color={PALETTE.amber} intensity={40} distance={40} decay={2} />

      {caps.steam > 0 && <Steam count={caps.steam} />}
    </group>
  )
}
