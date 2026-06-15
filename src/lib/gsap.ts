/**
 * Single GSAP entry point. ScrollTrigger is registered exactly ONCE here.
 * Import { gsap, ScrollTrigger } from '@/lib/gsap' everywhere — never call
 * gsap.registerPlugin elsewhere.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
