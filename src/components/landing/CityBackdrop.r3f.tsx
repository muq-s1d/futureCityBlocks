import { Suspense, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { CityField } from '@/components/r3f/CityField.r3f'
import { useQualityCaps } from '@/stores/qualityStore'
import type { WorldStage } from '@/stores/worldStore'
import type { PlacedAsset } from '@/lib/assets'

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
  toBuilder,
  stage,
  interactive,
  authActive,
  placedObjects,
  placing,
  onAuthSuccess,
  onEnterPlot,
  onSignOut,
  onRequestDelete,
  onGroundPick,
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
  placedObjects: PlacedAsset[]
  placing: boolean
  onAuthSuccess: () => void
  onEnterPlot: (districtId: string) => void
  onSignOut: () => void
  onRequestDelete: () => void
  onGroundPick: (x: number, z: number) => void
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
        // preserveDrawingBuffer keeps the WebGL backbuffer readable so the
        // builder can snapshot a thumbnail via gl.domElement.toDataURL().
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
            placedObjects={placedObjects}
            placing={placing}
            onAuthSuccess={onAuthSuccess}
            onEnterPlot={onEnterPlot}
            onSignOut={onSignOut}
            onRequestDelete={onRequestDelete}
            onGroundPick={onGroundPick}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}
