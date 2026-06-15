import GlitchText from '@/components/reactbits/GlitchText/GlitchText'
import { HERO } from '@/constants/landing'

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p
        data-reveal
        className="text-readable mb-10 font-mono text-sm tracking-[0.5em] text-cyan/85 uppercase"
      >
        {HERO.kicker}
      </p>

      <div data-reveal>
        <GlitchText speed={0.6} enableShadows className="font-display">
          {HERO.title}
        </GlitchText>
      </div>

      <p
        data-reveal
        className="text-readable mt-10 max-w-2xl font-mono text-lg leading-relaxed text-cyan sm:text-xl"
      >
        {HERO.tagline}
      </p>

      <div data-reveal className="mt-20 flex flex-col items-center gap-3">
        <span className="text-readable font-mono text-xs tracking-[0.4em] text-cyan/70 uppercase">
          {HERO.scrollHint}
        </span>
        <span className="h-12 w-px animate-pulse bg-gradient-to-b from-cyan/60 to-transparent" />
      </div>
    </section>
  )
}
