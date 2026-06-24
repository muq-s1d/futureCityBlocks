import { useEffect, type RefObject } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { HighwaySign } from '@/components/r3f/HighwaySign.r3f'
import { AuthKiosk } from '@/components/r3f/AuthKiosk.r3f'
import { CameraRig } from '@/components/r3f/CameraRig.r3f'
import { Skyline } from '@/components/r3f/Skyline.r3f'
import { PlotField, type ReserveRect } from '@/components/city/PlotField.r3f'
import { Rain } from '@/components/city/Rain.r3f'
import { Storefront } from '@/components/city/Storefront.r3f'
import { StorefrontAtmosphere } from '@/components/city/StorefrontAtmosphere.r3f'
import { StorefrontDashboard } from '@/components/city/StorefrontDashboard.r3f'
import { BuilderScene } from '@/components/builder/BuilderScene.r3f'
import { AssetMesh } from '@/components/r3f/AssetMesh.r3f'
import { PlotGroundPicker } from '@/components/city/PlotGroundPicker.r3f'
import type { PlacedAsset } from '@/lib/assets'
import { loadCityPlots } from '@/lib/city'
import { useCityStore } from '@/stores/cityStore'
import { useAuthStore } from '@/stores/authStore'
import { useQualityStore } from '@/stores/qualityStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'
import type { WorldStage } from '@/stores/worldStore'

const CITY_OFFSET = new THREE.Vector3(0, 0, 0)
const STOREFRONT_POS: [number, number, number] = [-24, 0, -212]
const STOREFRONT_RESERVE: ReserveRect = { minX: -40, maxX: -8, minZ: -232, maxZ: -192 }

export function CityField({
  progress,
  approach,
  toCity,
  toStore,
  toPlot,
  toBuilder,
  stage,
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
  authActive: boolean
  placedObjects: PlacedAsset[]
  placing: boolean
  onAuthSuccess: () => void
  onEnterPlot: (districtId: string) => void
  onSignOut: () => void
  onRequestDelete: () => void
  onGroundPick: (x: number, z: number) => void
}) {
  const plots = useCityStore((s) => s.plots)
  const weather = useCityStore((s) => s.weather)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const downgrade = useQualityStore((s) => s.downgrade)
  const loadWorldConfig = useWorldConfigStore((s) => s.loadWorldConfig)

  useEffect(() => {
    if (stage !== 'landing' && plots.length === 0) {
      void loadWorldConfig().then(() => loadCityPlots())
    }
  }, [stage, plots.length, loadWorldConfig])

  const showCity = stage !== 'landing'

  return (
    <>
      <PerformanceMonitor onDecline={() => downgrade()} />

      <CameraRig
        progress={progress}
        approach={approach}
        toCity={toCity}
        toStore={toStore}
        toPlot={toPlot}
        toBuilder={toBuilder}
        stage={stage}
      />

      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -240]}>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color={PALETTE.void} roughness={1} metalness={0} />
      </mesh>

      <Skyline />
      <HighwaySign />
      <AuthKiosk active={authActive} onSuccess={onAuthSuccess} />

      {showCity && (
        <>
          <group position={CITY_OFFSET}>
            <PlotField
              plots={plots}
              ownedPlotId={ownedPlot?.id ?? null}
              reserve={STOREFRONT_RESERVE}
              hideBeacon={stage === 'builder'}
            />
            {(stage === 'plot' || stage === 'builder') &&
              placedObjects.map((obj) => <AssetMesh key={obj.id} object={obj} />)}
            {placing && stage === 'plot' && ownedPlot && (
              <PlotGroundPicker plot={ownedPlot} onPick={onGroundPick} />
            )}
          </group>

          {stage === 'builder' && <BuilderScene />}
          <Storefront position={STOREFRONT_POS}>
            <StorefrontAtmosphere />
            {stage === 'dashboard' && (
              <StorefrontDashboard
                ownedPlot={ownedPlot}
                onPick={onEnterPlot}
                onSignOut={onSignOut}
                onRequestDelete={onRequestDelete}
              />
            )}
          </Storefront>
          {weather === 'rain' && (
            <group position={[0, 0, -150]}>
              <Rain />
            </group>
          )}
        </>
      )}
    </>
  )
}
