import { useEffect, useRef, useState } from 'react'
import { gsap } from '@/lib/gsap'
import { claimPlot } from '@/lib/city'
import { useWorldStore } from '@/stores/worldStore'
import { useAuthStore } from '@/stores/authStore'
import { useBuilderStore } from '@/stores/builderStore'

function reduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useStageRouter() {
  const stage = useWorldStore((s) => s.stage)
  const setStage = useWorldStore((s) => s.setStage)
  const user = useAuthStore((s) => s.user)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const initializing = useAuthStore((s) => s.initializing)

  const scrollProgress = useRef(0)
  const approach = useRef(0)
  const toCity = useRef(0)
  const toStore = useRef(0)
  const toPlot = useRef(0)
  const toBuilder = useRef(0)

  const [entering, setEntering] = useState(false)
  const enteringRef = useRef(false)
  const [enteringBuilder, setEnteringBuilder] = useState(false)

  // Returning sessions: snap all blend refs so the world opens at the dashboard.
  const initialAuthChecked = useRef(false)
  useEffect(() => {
    if (initialAuthChecked.current || initializing) return
    initialAuthChecked.current = true
    if (!user) return
    scrollProgress.current = 1
    approach.current = 1
    toCity.current = 1
    toStore.current = 1
    toPlot.current = 0
    enteringRef.current = true
    setEntering(true)
    setStage('dashboard')
  }, [initializing, user, setStage])

  const handleEnter = (ensureAtEnd: () => void) => {
    if (enteringRef.current) return
    ensureAtEnd()
    enteringRef.current = true
    setEntering(true)
    setStage('auth')
    if (reduced()) {
      approach.current = 1
      return
    }
    gsap.to(approach, { current: 1, duration: 2.6, ease: 'power2.inOut' })
  }

  const handleAuthSuccess = () => {
    setStage('dashboard')
    if (reduced()) {
      toCity.current = 1
      toStore.current = 1
      return
    }
    gsap.to(toCity, {
      current: 1,
      duration: 2.2,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.to(toStore, { current: 1, duration: 1.5, ease: 'power2.inOut' })
      },
    })
  }

  const flyToPlot = () => {
    setStage('plot')
    if (reduced()) {
      toPlot.current = 1
      return
    }
    gsap.to(toPlot, { current: 1, duration: 2.4, ease: 'power2.inOut' })
  }

  const claimingRef = useRef(false)
  const handleEnterPlot = (districtId: string) => {
    if (claimingRef.current) return
    if (ownedPlot) {
      flyToPlot()
      return
    }
    claimingRef.current = true
    claimPlot(districtId)
      .then(() => flyToPlot())
      .catch((err) => console.error('claim_plot failed', err))
      .finally(() => {
        claimingRef.current = false
      })
  }

  const handleBackToCity = () => {
    setStage('dashboard')
    if (reduced()) {
      toPlot.current = 0
      return
    }
    gsap.to(toPlot, { current: 0, duration: 1.8, ease: 'power2.inOut' })
  }

  const handleEnterBuilder = () => {
    const b = useBuilderStore.getState()
    b.resetRuntime()
    setEnteringBuilder(true)
    if (reduced()) {
      toBuilder.current = 1
      setStage('builder')
      return
    }
    gsap.to(toBuilder, {
      current: 1,
      duration: 1.6,
      ease: 'power2.inOut',
      onComplete: () => setStage('builder'),
    })
  }

  const handleExitBuilder = (refreshPlotObjects: () => Promise<void>) => {
    const b = useBuilderStore.getState()
    b.resetRuntime()
    setEnteringBuilder(false)
    setStage('plot')
    void refreshPlotObjects()
    if (reduced()) {
      toBuilder.current = 0
      return
    }
    gsap.to(toBuilder, { current: 0, duration: 1.4, ease: 'power2.inOut' })
  }

  const resetToLanding = () => {
    enteringRef.current = false
    setEntering(false)
    approach.current = 0
    toCity.current = 0
    toStore.current = 0
    toPlot.current = 0
    toBuilder.current = 0
    scrollProgress.current = 0
    setEnteringBuilder(false)
    window.scrollTo(0, 0)
    setStage('landing')
  }

  const handleBack = () => {
    setEnteringBuilder(false)
    toBuilder.current = 0
    const done = () => {
      enteringRef.current = false
      setEntering(false)
      setStage('landing')
    }
    if (reduced()) {
      approach.current = 0
      toCity.current = 0
      toStore.current = 0
      toPlot.current = 0
      done()
      return
    }
    gsap.to(toPlot, { current: 0, duration: 1.4, ease: 'power2.inOut' })
    gsap.to(toStore, { current: 0, duration: 1.4, ease: 'power2.inOut' })
    gsap.to(toCity, { current: 0, duration: 1.4, ease: 'power2.inOut' })
    gsap.to(approach, { current: 0, duration: 1.4, ease: 'power2.inOut', onComplete: done })
  }

  return {
    stage,
    entering,
    enteringRef,
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
  }
}
