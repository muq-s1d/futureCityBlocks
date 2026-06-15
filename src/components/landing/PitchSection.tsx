import LetterGlitch from '@/components/reactbits/LetterGlitch/LetterGlitch'
import { PITCH_STEPS } from '@/constants/landing'
import { PALETTE } from '@/constants/palette'

export function PitchSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-28">
      {/* A6 — faint data wall behind the terminal */}
      <div className="absolute inset-0 -z-[1] opacity-20">
        <LetterGlitch
          glitchColors={[PALETTE.muted, PALETTE.cyan, PALETTE.magenta]}
          glitchSpeed={60}
          centerVignette
          outerVignette
          smooth
          characters="01<>/[]{}#*+=FUTURECITY"
        />
      </div>

      <div
        data-reveal
        className="w-full max-w-2xl border border-border bg-void/80 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-magenta" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber" />
          <span className="h-2.5 w-2.5 rounded-full bg-cyan" />
          <span className="ml-3 font-mono text-xs tracking-widest text-cyan/50 lowercase">
            how_it_works.sh
          </span>
        </div>

        <div className="space-y-8 p-8 font-mono">
          {PITCH_STEPS.map((s) => (
            <div key={s.no} data-reveal className="flex gap-4">
              <span className="text-magenta">{s.no}</span>
              <div>
                <p className="text-lg font-bold text-cyan">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.detail}</p>
              </div>
            </div>
          ))}
          <p data-reveal className="border-t border-border pt-6 text-sm text-cyan/60">
            <span className="text-magenta">{'> '}</span>
            two hundred plots. claimed one at a time.
          </p>
        </div>
      </div>
    </section>
  )
}
