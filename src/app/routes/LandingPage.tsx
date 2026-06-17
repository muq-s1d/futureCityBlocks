import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import TargetCursor from '@/components/reactbits/TargetCursor/TargetCursor'
import { CityBackdrop } from '@/components/landing/CityBackdrop.r3f'
import { Atmosphere } from '@/components/landing/Atmosphere'
import { HudFrame } from '@/components/landing/HudFrame'
import { HeroSection } from '@/components/landing/HeroSection'
import { DistrictsSection } from '@/components/landing/DistrictsSection'
import { PitchSection } from '@/components/landing/PitchSection'
import { CtaSection } from '@/components/landing/CtaSection'
import { PlotHud } from '@/components/city/PlotHud'
import { useWorldStore } from '@/stores/worldStore'
import { useAuthStore } from '@/stores/authStore'

export default function LandingPage() {
  const stage = useWorldStore((s) => s.stage)
  const setStage = useWorldStore((s) => s.setStage)
  const user = useAuthStore((s) => s.user)
  const initializing = useAuthStore((s) => s.initializing)
  // Mutated by ScrollTrigger, read by the R3F camera each frame (no re-render).
  const scrollProgress = useRef(0)
  // Camera blend refs (0→1), animated by GSAP as the user moves through the flow:
  // approach → kiosk, toCity → deep fly-in, toStore → 90° pan to storefront,
  // toPlot → their plot.
  const approach = useRef(0)
  const toCity = useRef(0)
  const toStore = useRef(0)
  const toPlot = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  // Imperative jump-to-section, wired up inside the effect, used by Skip intro.
  const goToRef = useRef<(i: number) => void>(() => {})

  // Approach state: locks scrolling while the camera flies to the access
  // terminal. enteringRef mirrors `entering` for the (once-bound) scroll
  // handlers.
  const [entering, setEntering] = useState(false)
  const enteringRef = useRef(false)

  // Returning sessions skip the landing + kiosk entirely. The first time the
  // initial auth check resolves WITH a session, snap every camera leg to its end
  // so the world opens already parked at the storefront dashboard. Runs once: a
  // fresh in-flow kiosk login (initializing already false) never trips it, so its
  // animated fly-in is preserved.
  const initialAuthChecked = useRef(false)
  useEffect(() => {
    if (initialAuthChecked.current || initializing) return
    initialAuthChecked.current = true
    if (!user) return // no existing session → normal landing flow
    scrollProgress.current = 1
    approach.current = 1
    toCity.current = 1
    toStore.current = 1
    toPlot.current = 0
    enteringRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntering(true)
    setStage('dashboard')
  }, [initializing, user, setStage])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sections = mainRef.current
      ? Array.from(mainRef.current.querySelectorAll<HTMLElement>('section'))
      : []

    // ── Discrete section snapping ───────────────────────────────────────────
    // One wheel notch / swipe / arrow key = exactly one section. We intercept
    // the gesture ourselves and tween the scroll with GSAP, so inertial
    // scrolling can never fly past a section. This is GSAP, not CSS scroll-snap.
    let index = 0
    let animating = false

    const goTo = (i: number) => {
      if (enteringRef.current) return // camera is flying to the sign — page is locked
      i = Math.max(0, Math.min(sections.length - 1, i))
      if (animating || i === index || !sections[i]) return
      index = i
      animating = true
      gsap.to(window, {
        duration: 0.6,
        ease: 'power3.inOut',
        scrollTo: { y: sections[i], autoKill: false },
        onComplete: () => {
          animating = false
        },
      })
    }
    goToRef.current = goTo

    const ctx = gsap.context(() => {
      // Whole-page scroll 0→1 drives the city descent (camera in CityField).
      ScrollTrigger.create({
        trigger: rootRef.current!,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          scrollProgress.current = self.progress
        },
      })

      if (prefersReduced) {
        gsap.set('[data-reveal]', { opacity: 1, y: 0 })
        return
      }

      // Staggered reveal as each block enters the viewport.
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 42,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        })
      })
    }, rootRef)

    // Keep `index` honest after layout shifts (resize, font load, deep links).
    const syncIndex = () => {
      const mid = window.scrollY + window.innerHeight / 2
      let nearest = 0
      sections.forEach((s, i) => {
        if (s.offsetTop <= mid) nearest = i
      })
      index = nearest
    }

    // Plain wheel/touch/key handlers — no Observer tolerance that a trackpad's
    // tiny deltas can fail to reach. A wheel "burst" (incl. inertial tail) is
    // collapsed to a single section move via an idle-timer lock.
    let onWheel: ((e: WheelEvent) => void) | undefined
    let onKey: ((e: KeyboardEvent) => void) | undefined
    let onTouchStart: ((e: TouchEvent) => void) | undefined
    let onTouchMove: ((e: TouchEvent) => void) | undefined
    let onTouchEnd: ((e: TouchEvent) => void) | undefined

    if (!prefersReduced && sections.length > 1) {
      let wheelLocked = false
      let idle: number | undefined
      onWheel = (e: WheelEvent) => {
        e.preventDefault()
        if (!wheelLocked && Math.abs(e.deltaY) > 0) {
          wheelLocked = true
          goTo(index + (e.deltaY > 0 ? 1 : -1))
        }
        // Stay locked until the burst (and its momentum) goes quiet.
        window.clearTimeout(idle)
        idle = window.setTimeout(() => {
          wheelLocked = false
        }, 140)
      }

      onKey = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowDown':
          case 'PageDown':
            e.preventDefault()
            goTo(index + 1)
            break
          case 'ArrowUp':
          case 'PageUp':
            e.preventDefault()
            goTo(index - 1)
            break
          case 'Home':
            e.preventDefault()
            goTo(0)
            break
          case 'End':
            e.preventDefault()
            goTo(sections.length - 1)
            break
        }
      }

      let touchStartY: number | null = null
      onTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0]?.clientY ?? null
      }
      onTouchMove = (e: TouchEvent) => {
        e.preventDefault() // block native rubber-band scroll
      }
      onTouchEnd = (e: TouchEvent) => {
        if (touchStartY == null) return
        const dy = touchStartY - (e.changedTouches[0]?.clientY ?? touchStartY)
        if (Math.abs(dy) > 40) goTo(index + (dy > 0 ? 1 : -1))
        touchStartY = null
      }

      window.addEventListener('wheel', onWheel, { passive: false })
      window.addEventListener('keydown', onKey)
      window.addEventListener('touchstart', onTouchStart, { passive: false })
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd)
      window.addEventListener('resize', syncIndex)
    }

    // Re-measure once fonts/layout settle.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 250)

    return () => {
      window.clearTimeout(refresh)
      if (onWheel) window.removeEventListener('wheel', onWheel)
      if (onKey) window.removeEventListener('keydown', onKey)
      if (onTouchStart) window.removeEventListener('touchstart', onTouchStart)
      if (onTouchMove) window.removeEventListener('touchmove', onTouchMove)
      if (onTouchEnd) window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', syncIndex)
      ctx.revert()
    }
  }, [])

  const skip = () => goToRef.current(3)

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // "Enter the City": settle at street level, then pull the camera back onto the
  // approach highway and frame the 3D access terminal (AuthKiosk).
  const handleEnter = () => {
    if (enteringRef.current) return
    goToRef.current(3) // make sure the descent is complete (street level)
    enteringRef.current = true
    setEntering(true)
    setStage('auth')
    if (reduced()) {
      approach.current = 1
      return
    }
    gsap.to(approach, { current: 1, duration: 2.6, ease: 'power2.inOut' })
  }

  // Auth success: don't leave the canvas — keep flying the same camera. Two
  // phases: fly DEEP down the highway into the city (toCity), settle, then turn
  // ~90° left to face the storefront (toStore).
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

  // Picked a district / entered plot: fly from the storefront to the user's plot.
  const handleEnterPlot = () => {
    setStage('plot')
    if (reduced()) {
      toPlot.current = 1
      return
    }
    gsap.to(toPlot, { current: 1, duration: 2.4, ease: 'power2.inOut' })
  }

  // From the plot view, fly back out to the storefront/dashboard (not all the
  // way to landing).
  const handleBackToCity = () => {
    setStage('dashboard')
    if (reduced()) {
      toPlot.current = 0
      return
    }
    gsap.to(toPlot, { current: 0, duration: 1.8, ease: 'power2.inOut' })
  }

  // Return all the way back to the landing page from any stage.
  const handleBack = () => {
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

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      <TargetCursor targetSelector=".cursor-target" hideDefaultCursor spinDuration={3} />
      <CityBackdrop
        progress={scrollProgress}
        approach={approach}
        toCity={toCity}
        toStore={toStore}
        toPlot={toPlot}
        stage={stage}
        interactive={entering}
        authActive={stage === 'auth'}
        onAuthSuccess={handleAuthSuccess}
        onEnterPlot={handleEnterPlot}
      />
      <Atmosphere fading={entering} />
      {!entering && <HudFrame progress={scrollProgress} />}

      <main ref={mainRef} className={`relative z-10 ${entering ? 'pointer-events-none' : ''}`}>
        <HeroSection />
        <DistrictsSection />
        <PitchSection />
        <div id="enter">
          <CtaSection onEnter={handleEnter} />
        </div>
      </main>

      {/* In-world access terminal: the sign-up / log-in form lives on the 3D
          AuthKiosk (inside the canvas). Only the "back" control is a DOM
          overlay sitting above it. */}
      {entering && (
        <button
          onClick={handleBack}
          className="cursor-target fixed bottom-10 left-1/2 z-50 -translate-x-1/2 font-mono text-xs tracking-[0.3em] text-cyan/60 uppercase transition-colors hover:text-cyan"
        >
          ← back to the landing
        </button>
      )}

      {/* The storefront dashboard (district chooser) is rendered in-world on the
          façade — see StorefrontDashboard inside CityField. */}

      {/* Plot view: arrived at the user's plot (in-world marker + this HUD). */}
      {stage === 'plot' && (
        <PlotHud onBackToCity={handleBackToCity} onBackToLanding={handleBack} />
      )}

      {/* Skip control for impatient users (immersive-pattern best practice). */}
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
