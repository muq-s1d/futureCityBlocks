import { useEffect, useRef, type RefObject } from 'react'
import { gsap, ScrollTrigger } from '@/lib/gsap'

export function useLandingScroll(
  rootRef: RefObject<HTMLDivElement | null>,
  mainRef: RefObject<HTMLElement | null>,
  scrollProgress: RefObject<number>,
  enteringRef: RefObject<boolean>,
) {
  const goToRef = useRef<(i: number) => void>(() => {})

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sections = mainRef.current
      ? Array.from(mainRef.current.querySelectorAll<HTMLElement>('section'))
      : []

    let index = 0
    let animating = false

    const goTo = (i: number) => {
      if (enteringRef.current) return
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

    const syncIndex = () => {
      const mid = window.scrollY + window.innerHeight / 2
      let nearest = 0
      sections.forEach((s, i) => {
        if (s.offsetTop <= mid) nearest = i
      })
      index = nearest
    }

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
        e.preventDefault()
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
  }, [rootRef, mainRef, scrollProgress, enteringRef])

  return { goToRef }
}
