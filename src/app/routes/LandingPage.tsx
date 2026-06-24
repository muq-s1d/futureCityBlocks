import { useRef, useState } from 'react'
import TargetCursor from '@/components/reactbits/TargetCursor/TargetCursor'
import { CityBackdrop } from '@/components/landing/CityBackdrop.r3f'
import { Atmosphere } from '@/components/landing/Atmosphere'
import { HudFrame } from '@/components/landing/HudFrame'
import { HeroSection } from '@/components/landing/HeroSection'
import { DistrictsSection } from '@/components/landing/DistrictsSection'
import { PitchSection } from '@/components/landing/PitchSection'
import { CtaSection } from '@/components/landing/CtaSection'
import { PlotHud } from '@/components/city/PlotHud'
import { EnvHud } from '@/components/city/EnvHud'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BuilderHud } from '@/components/builder/BuilderHud'
import { BuilderPauseMenu } from '@/components/builder/BuilderPauseMenu'
import { AssetLibraryPanel } from '@/components/builder/AssetLibraryPanel'
import { useAuthStore } from '@/stores/authStore'
import { usePlotObjects } from '@/hooks/usePlotObjects'
import { useStageRouter } from '@/hooks/useStageRouter'
import { useLandingScroll } from '@/hooks/useLandingScroll'
import { placeAssetOnPlot } from '@/lib/assets'
import { signOut, deleteAccount } from '@/lib/auth'
import type { Asset } from '@/types/db'

export default function LandingPage() {
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const rootRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const router = useStageRouter()
  const { goToRef } = useLandingScroll(rootRef, mainRef, router.scrollProgress, router.enteringRef)

  const {
    stage,
    entering,
    enteringBuilder,
    scrollProgress,
    approach,
    toCity,
    toStore,
    toPlot,
    toBuilder,
    handleEnter,
    handleAuthSuccess,
    handleEnterPlot,
    handleBackToCity,
    handleEnterBuilder,
    handleExitBuilder,
    handleBack,
    resetToLanding,
  } = router

  // Plot objects (placed assets) — shared between plot view and builder context.
  const { objects: placedObjects, refresh: refreshPlotObjects } = usePlotObjects(
    ownedPlot?.id ?? null,
  )

  // Asset placement flow
  const [placeLibraryOpen, setPlaceLibraryOpen] = useState(false)
  const [placing, setPlacing] = useState(false)
  const armedAsset = useRef<Asset | null>(null)

  const armPlacement = (asset: Asset) => {
    armedAsset.current = asset
    setPlaceLibraryOpen(false)
    setPlacing(true)
  }
  const cancelPlacement = () => {
    armedAsset.current = null
    setPlacing(false)
  }
  const handleGroundPick = (x: number, z: number) => {
    const asset = armedAsset.current
    if (!asset || !ownedPlot) return
    setPlacing(false)
    armedAsset.current = null
    placeAssetOnPlot(ownedPlot.id, asset.id, x, 0, z)
      .then(() => refreshPlotObjects())
      .catch((err) => console.error('placeAssetOnPlot failed', err))
  }

  // Auth actions
  const handleSignOut = () => {
    void signOut().finally(resetToLanding)
  }

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const handleConfirmDelete = () => {
    setDeleteBusy(true)
    deleteAccount()
      .then(() => {
        setDeleteOpen(false)
        resetToLanding()
      })
      .catch((err) => console.error('delete_user failed', err))
      .finally(() => setDeleteBusy(false))
  }

  const skip = () => goToRef.current(3)

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      {stage !== 'builder' && (
        <TargetCursor targetSelector=".cursor-target" hideDefaultCursor spinDuration={3} />
      )}
      <CityBackdrop
        progress={scrollProgress}
        approach={approach}
        toCity={toCity}
        toStore={toStore}
        toPlot={toPlot}
        toBuilder={toBuilder}
        stage={stage}
        interactive={entering}
        authActive={stage === 'auth'}
        placedObjects={placedObjects}
        placing={placing}
        onAuthSuccess={handleAuthSuccess}
        onEnterPlot={handleEnterPlot}
        onSignOut={handleSignOut}
        onRequestDelete={() => setDeleteOpen(true)}
        onGroundPick={handleGroundPick}
      />
      <Atmosphere fading={entering} />
      {!entering && <HudFrame progress={scrollProgress} />}

      <main ref={mainRef} className={`relative z-10 ${entering ? 'pointer-events-none' : ''}`}>
        <HeroSection />
        <DistrictsSection />
        <PitchSection />
        <div id="enter">
          <CtaSection onEnter={() => handleEnter(() => goToRef.current(3))} />
        </div>
      </main>

      {entering && (
        <button
          onClick={handleBack}
          className="cursor-target fixed bottom-10 left-1/2 z-50 -translate-x-1/2 font-mono text-xs tracking-[0.3em] text-cyan/60 uppercase transition-colors hover:text-cyan"
        >
          ← back to the landing
        </button>
      )}

      {(stage === 'dashboard' || stage === 'plot') && <EnvHud />}

      {stage === 'builder' && (
        <>
          <BuilderHud />
          <BuilderPauseMenu onExit={() => handleExitBuilder(refreshPlotObjects)} />
        </>
      )}

      {placeLibraryOpen && stage === 'plot' && (
        <AssetLibraryPanel
          title="Place an asset"
          hint="Pick a saved asset, then click a spot on your plot"
          onPick={armPlacement}
          onClose={() => setPlaceLibraryOpen(false)}
        />
      )}

      {placing && stage === 'plot' && (
        <div className="pointer-events-none fixed top-24 left-1/2 z-40 -translate-x-1/2 select-none">
          <div className="hud-panel pointer-events-auto flex items-center gap-4 px-6 py-3">
            <span className="font-mono text-xs tracking-[0.2em] text-cyan uppercase">
              Click a spot on your plot to place it
            </span>
            <button
              onClick={cancelPlacement}
              className="font-mono text-[11px] tracking-[0.25em] text-magenta/80 uppercase transition-colors hover:text-magenta"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        danger
        busy={deleteBusy}
        title="Delete account?"
        confirmLabel="Delete forever"
        cancelLabel="Keep account"
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleteBusy && setDeleteOpen(false)}
      >
        This permanently deletes your account and releases your plot back to the
        city. This cannot be undone.
      </ConfirmDialog>

      {stage === 'plot' && !enteringBuilder && (
        <PlotHud
          onBackToCity={handleBackToCity}
          onBackToLanding={handleBack}
          onEnterBuilder={handleEnterBuilder}
          onPlaceAsset={() => setPlaceLibraryOpen(true)}
        />
      )}

      {!entering && (
        <button
          onClick={skip}
          className="cursor-target text-readable fixed right-6 bottom-12 z-40 cursor-pointer font-mono text-xs tracking-[0.3em] text-cyan/70 uppercase transition-colors hover:text-cyan focus-visible:text-cyan focus-visible:outline-none"
        >
          Skip intro ↓
        </button>
      )}
    </div>
  )
}
