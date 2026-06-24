import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { cityHalfWidth, cityHalfDepth } from '@/lib/cityGrid'
import { useWorldConfigStore } from '@/stores/worldConfigStore'

const COUNT = 1400
const TOP = 130
const dummy = new THREE.Object3D()

interface Pool {
  y: Float32Array
  x: Float32Array
  z: Float32Array
  v: Float32Array
}

export function Rain() {
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)
  const SPAN_X = useMemo(() => cityHalfWidth(cityConfig) * 2 + 60, [cityConfig])
  const SPAN_Z = useMemo(() => cityHalfDepth(cityConfig) * 2 + 60, [cityConfig])
  const ref = useRef<THREE.InstancedMesh>(null!)
  const pool = useRef<Pool | null>(null)

  useLayoutEffect(() => {
    const x = new Float32Array(COUNT)
    const y = new Float32Array(COUNT)
    const z = new Float32Array(COUNT)
    const v = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      x[i] = (Math.random() - 0.5) * SPAN_X
      y[i] = Math.random() * TOP
      z[i] = (Math.random() - 0.5) * SPAN_Z
      v[i] = 55 + Math.random() * 75
      dummy.position.set(x[i]!, y[i]!, z[i]!)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
    pool.current = { x, y, z, v }
  }, [])

  useFrame((_, dt) => {
    const p = pool.current
    if (!p) return
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < COUNT; i++) {
      p.y[i]! -= p.v[i]! * step
      if (p.y[i]! < 0) p.y[i]! += TOP
      dummy.position.set(p.x[i]!, p.y[i]!, p.z[i]!)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.05, 2, 0.05]} />
      <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.28} toneMapped={false} />
    </instancedMesh>
  )
}
