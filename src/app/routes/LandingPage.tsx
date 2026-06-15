import { useEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'
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

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      // Whole-page scroll 0→1 drives the city descent.
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

    // Re-measure once fonts/layout settle.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 250)

    return () => {
      window.clearTimeout(refresh)
      ctx.revert()
    }
  }, [])

  const skip = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('enter')?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <div ref={rootRef} className="relative overflow-x-hidden">
      <CityBackdrop progress={scrollProgress} />
      <Atmosphere />
      <HudFrame progress={scrollProgress} />

      <main className="relative z-10">
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
        className="fixed right-6 bottom-12 z-40 cursor-pointer font-mono text-[0.65rem] tracking-[0.3em] text-cyan/50 uppercase transition-colors hover:text-cyan focus-visible:text-cyan focus-visible:outline-none"
      >
        Skip intro ↓
      </button>
    </div>
  )
}
