import { Suspense, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityField } from '@/components/r3f/CityField.r3f'

/**
 * Fixed full-viewport R3F canvas behind the landing content. The scroll-progress
 * ref drives the in-scene camera descent (see CityField).
 */
export function CityBackdrop({ progress }: { progress: RefObject<number> }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ fov: 62, near: 0.1, far: 1200, position: [0, 125, 100] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <CityField progress={progress} />
        </Suspense>
      </Canvas>
    </div>
  )
}
