/**
 * Single GSAP entry point. ScrollTrigger is registered exactly ONCE here.
 * Import { gsap, ScrollTrigger } from '@/lib/gsap' everywhere — never call
 * gsap.registerPlugin elsewhere.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

export { gsap, ScrollTrigger, ScrollToPlugin }
