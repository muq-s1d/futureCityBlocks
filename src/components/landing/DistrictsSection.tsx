import DecryptedText from '@/components/reactbits/DecryptedText/DecryptedText'
import { DISTRICT_BLURBS } from '@/constants/landing'

// Static class maps so Tailwind can see every utility at build time.
const COLOR = {
  cyan: { text: 'text-cyan', bar: 'bg-cyan' },
  amber: { text: 'text-amber', bar: 'bg-amber' },
  magenta: { text: 'text-magenta', bar: 'bg-magenta' },
} as const

export function DistrictsSection() {
  return (
    <section className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-28">
      {/* Frosted panel keeps the editorial rows readable over the skyline. */}
      <div data-reveal className="hud-panel rounded-sm px-6 py-8 sm:px-10 sm:py-10">
        <p className="mb-2 font-mono text-sm tracking-[0.35em] text-magenta uppercase">
          // three districts · one grid
        </p>

        {DISTRICT_BLURBS.map((d) => {
          const c = COLOR[d.colorKey]
          return (
            <article
              key={d.id}
              data-reveal
              className="flex items-start gap-5 border-t border-border py-8 sm:gap-7"
            >
              <span className={`pt-1 font-mono text-base ${c.text}`}>{d.index}</span>
              <span className={`mt-1 h-14 w-1 ${c.bar}`} aria-hidden />
              <div className="flex-1">
                <h3 className={`font-display text-3xl font-bold sm:text-5xl ${c.text}`}>
                  <DecryptedText
                    text={d.label}
                    animateOn="view"
                    sequential
                    speed={38}
                    maxIterations={14}
                    className={c.text}
                    encryptedClassName="text-muted"
                  />
                </h3>
                <p className="mt-3 font-mono text-base text-cyan/90">{d.tagline}</p>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-cyan/65">
                  {d.body}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
