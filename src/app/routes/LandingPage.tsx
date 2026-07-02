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
import { useAuthStore } from '@/stores/authStore'
import { useBuilderStore } from '@/stores/builderStore'
import { useStageRouter } from '@/hooks/useStageRouter'
import { useLandingScroll } from '@/hooks/useLandingScroll'
import { loadPlotBlocks, savePlotBlocks } from '@/lib/city'
import { signOut, deleteAccount } from '@/lib/auth'

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

  const enterBuilder = () => {
    if (!ownedPlot) return
    const store = useBuilderStore.getState()
    store.setPlotId(ownedPlot.id)
    loadPlotBlocks(ownedPlot.id)
      .then((blocks) => {
        store.loadBlocks(blocks)
        handleEnterBuilder()
      })
      .catch(() => {
        store.loadBlocks(ownedPlot.voxel_data ?? [])
        handleEnterBuilder()
      })
  }

  const exitBuilder = async () => {
    const store = useBuilderStore.getState()
    if (store.mode === 'template') store.setMode('build')
    const plotId = store.plotId
    const blocks = [...store.blocks]
    if (plotId != null) {
      try {
        await savePlotBlocks(plotId, blocks)
      } catch (err) {
        console.error('savePlotBlocks failed', err)
      }
    }
    if (ownedPlot) {
      useAuthStore.getState().setOwnedPlot({ ...ownedPlot, voxel_data: blocks })
    }
    handleExitBuilder(async () => {})
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
        onAuthSuccess={handleAuthSuccess}
        onEnterPlot={handleEnterPlot}
        onSignOut={handleSignOut}
        onRequestDelete={() => setDeleteOpen(true)}
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
          <BuilderPauseMenu onExit={exitBuilder} />
        </>
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
          onEnterBuilder={enterBuilder}
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
