import { useEffect, useMemo, type RefObject } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE } from '@/constants/palette'
import { CELL } from '@/constants/builder'
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
import { VoxelBlocksMesh } from '@/components/r3f/VoxelBlocksMesh.r3f'
import { loadCityPlots } from '@/lib/city'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { useCityStore } from '@/stores/cityStore'
import { useAuthStore } from '@/stores/authStore'
import { useQualityStore } from '@/stores/qualityStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'
import type { WorldStage } from '@/stores/worldStore'

const CITY_OFFSET = new THREE.Vector3(0, 0, 0)
const STOREFRONT_POS: [number, number, number] = [-24, 0, -212]
const STOREFRONT_RESERVE: ReserveRect = { minX: -40, maxX: -8, minZ: -232, maxZ: -192 }

function PlotBlocks({ stage }: { stage: WorldStage }) {
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)

  const origin = useMemo(() => {
    if (!ownedPlot) return null
    const wx = plotWorldX(ownedPlot.grid_x, cityConfig)
    const wz = plotWorldZ(ownedPlot.grid_z, cityConfig)
    const W = cityConfig.LOT
    return [wx - (W * CELL) / 2, 0, wz - (W * CELL) / 2] as [number, number, number]
  }, [ownedPlot, cityConfig])

  if (!ownedPlot || !origin || stage === 'builder') return null
  if (!ownedPlot.voxel_data || ownedPlot.voxel_data.length === 0) return null

  return (
    <group position={origin}>
      <VoxelBlocksMesh blocks={ownedPlot.voxel_data} />
    </group>
  )
}

export function CityField({
  progress,
  approach,
  toCity,
  toStore,
  toPlot,
  toBuilder,
  stage,
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
  authActive: boolean
  onAuthSuccess: () => void
  onEnterPlot: (districtId: string) => void
  onSignOut: () => void
  onRequestDelete: () => void
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
            <PlotBlocks stage={stage} />
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
