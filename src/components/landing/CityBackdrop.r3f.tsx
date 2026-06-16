import { Suspense, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityField } from '@/components/r3f/CityField.r3f'

/**
 * Fixed full-viewport R3F canvas behind the landing content. The scroll-progress
 * ref drives the in-scene camera descent (see CityField). When the user enters
 * the access terminal we raise the canvas and enable pointer events so the in-
 * world 3D form (AuthKiosk) is clickable.
 */
export function CityBackdrop({
  progress,
  approach,
  interactive,
  authActive,
  onAuthSuccess,
}: {
  progress: RefObject<number>
  approach: RefObject<number>
  interactive: boolean
  authActive: boolean
  onAuthSuccess: () => void
}) {
  return (
    <div
      className={`fixed inset-0 ${
        interactive ? 'z-20 pointer-events-auto' : 'z-0 pointer-events-none'
      }`}
    >
      <Canvas
        dpr={[1, 1.6]}
        camera={{ fov: 62, near: 0.1, far: 1200, position: [0, 125, 100] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <CityField
            progress={progress}
            approach={approach}
            authActive={authActive}
            onAuthSuccess={onAuthSuccess}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
