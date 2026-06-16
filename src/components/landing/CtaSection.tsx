import GlitchText from '@/components/reactbits/GlitchText/GlitchText'
import ShinyText from '@/components/reactbits/ShinyText/ShinyText'
import { NeonButton } from '@/components/ui/NeonButton'
import { PALETTE } from '@/constants/palette'

export function CtaSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center gap-12 px-6 text-center">
      <p
        data-reveal
        className="text-readable font-mono text-sm tracking-[0.5em] text-cyan/80 uppercase"
      >
        street level reached
      </p>

      <div data-reveal>
        <GlitchText speed={1.6} shadowIntensity={2} className="font-display">
          ENTER THE CITY
        </GlitchText>
      </div>

      <div data-reveal>
        <NeonButton
          accent="magenta"
          onClick={onEnter}
          aria-label="Enter the city — continue to sign up"
          className="cursor-target"
        >
          <ShinyText text="Enter the City" speed={3} color={PALETTE.magenta} shineColor={PALETTE.cyan} />
          <span aria-hidden>→</span>
        </NeonButton>
      </div>

      <p data-reveal className="text-readable font-mono text-sm text-cyan/60">
        no wallet · no install · just build
      </p>
    </section>
  )
}
