import { Suspense, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityField } from '@/components/r3f/CityField.r3f'
import { useQualityCaps } from '@/stores/qualityStore'
import type { WorldStage } from '@/stores/worldStore'

/**
 * Fixed full-viewport R3F canvas behind the landing content — and the single
 * persistent world for the whole flow. The scroll-progress ref drives the city
 * descent; the approach / toCity / toPlot refs blend the camera through the
 * kiosk, storefront and plot legs (see CityField). When the user enters we raise
 * the canvas and enable pointer events so the in-world 3D forms are clickable.
 */
export function CityBackdrop({
  progress,
  approach,
  toCity,
  toStore,
  toPlot,
  stage,
  interactive,
  authActive,
  onAuthSuccess,
  onEnterPlot,
}: {
  progress: RefObject<number>
  approach: RefObject<number>
  toCity: RefObject<number>
  toStore: RefObject<number>
  toPlot: RefObject<number>
  stage: WorldStage
  interactive: boolean
  authActive: boolean
  onAuthSuccess: () => void
  onEnterPlot: (districtId: string) => void
}) {
  const caps = useQualityCaps()
  return (
    <div
      className={`fixed inset-0 ${
        interactive ? 'z-20 pointer-events-auto' : 'z-0 pointer-events-none'
      }`}
    >
      <Canvas
        dpr={[1, caps.dprMax]}
        camera={{ fov: 62, near: 0.1, far: 1200, position: [0, 125, 100] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <CityField
            progress={progress}
            approach={approach}
            toCity={toCity}
            toStore={toStore}
            toPlot={toPlot}
            stage={stage}
            authActive={authActive}
            onAuthSuccess={onAuthSuccess}
            onEnterPlot={onEnterPlot}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
