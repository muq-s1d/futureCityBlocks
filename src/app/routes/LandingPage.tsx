import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
import TargetCursor from '@/components/reactbits/TargetCursor/TargetCursor'
import { CityBackdrop } from '@/components/landing/CityBackdrop.r3f'
import { Atmosphere } from '@/components/landing/Atmosphere'
import { HudFrame } from '@/components/landing/HudFrame'
import { HeroSection } from '@/components/landing/HeroSection'
import { DistrictsSection } from '@/components/landing/DistrictsSection'
import { PitchSection } from '@/components/landing/PitchSection'
import { CtaSection } from '@/components/landing/CtaSection'

export default function LandingPage() {
  // Mutated by ScrollTrigger, read by the R3F camera each frame (no re-render).
  const scrollProgress = useRef(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  // Imperative jump-to-section, wired up inside the effect, used by Skip intro.
  const goToRef = useRef<(i: number) => void>(() => {})

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

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      <TargetCursor targetSelector=".cursor-target" hideDefaultCursor spinDuration={3} />
      <CityBackdrop progress={scrollProgress} />
      <Atmosphere />
      <HudFrame progress={scrollProgress} />

      <main ref={mainRef} className="relative z-10">
        <HeroSection />
        <DistrictsSection />
        <PitchSection />
        <div id="enter">
          <CtaSection />
        </div>
      </main>

      {/* Skip control for impatient users (immersive-pattern best practice). */}
      <button
        onClick={skip}
        className="cursor-target text-readable fixed right-6 bottom-12 z-40 cursor-pointer font-mono text-xs tracking-[0.3em] text-cyan/70 uppercase transition-colors hover:text-cyan focus-visible:text-cyan focus-visible:outline-none"
      >
        Skip intro ↓
      </button>
    </div>
  )
}
