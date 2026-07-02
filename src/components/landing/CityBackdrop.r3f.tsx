import { Suspense, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityField } from '@/components/r3f/CityField.r3f'
import { useQualityCaps } from '@/stores/qualityStore'
import type { WorldStage } from '@/stores/worldStore'

export function CityBackdrop({
  progress,
  approach,
  toCity,
  toStore,
  toPlot,
  toBuilder,
  stage,
  interactive,
  authActive,
  onAuthSuccess,
  onEnterPlot,
  onSignOut,
  onRequestDelete,
}: {
  progress: RefObject<number>
  approach: RefObject<number>
  toCity: RefObject<number>
  toStore: RefObject<number>
  toPlot: RefObject<number>
  toBuilder: RefObject<number>
  stage: WorldStage
  interactive: boolean
  authActive: boolean
  onAuthSuccess: () => void
  onEnterPlot: (districtId: string) => void
  onSignOut: () => void
  onRequestDelete: () => void
}) {
  const caps = useQualityCaps()
  return (
    <div
      className={`fixed inset-0 ${
        interactive ? 'z-20 pointer-events-auto' : 'z-0 pointer-events-none'
      }`}
    >
      <Canvas
        dpr={caps.dprMax}
        camera={{ fov: 62, near: 0.1, far: 1200, position: [0, 125, 100] }}
        gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <CityField
            progress={progress}
            approach={approach}
            toCity={toCity}
            toStore={toStore}
            toPlot={toPlot}
            toBuilder={toBuilder}
            stage={stage}
            authActive={authActive}
            onAuthSuccess={onAuthSuccess}
            onEnterPlot={onEnterPlot}
            onSignOut={onSignOut}
            onRequestDelete={onRequestDelete}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
