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
      <p
        data-reveal
        className="mb-6 font-mono text-xs tracking-[0.4em] text-cyan/50 uppercase"
      >
        // three districts · one grid
      </p>

      {DISTRICT_BLURBS.map((d) => {
        const c = COLOR[d.colorKey]
        return (
          <article
            key={d.id}
            data-reveal
            className="flex items-start gap-6 border-t border-border py-10"
          >
            <span className={`pt-1 font-mono text-sm ${c.text}`}>{d.index}</span>
            <span className={`mt-1 h-16 w-px ${c.bar}`} aria-hidden />
            <div className="flex-1">
              <h3 className={`font-display text-3xl font-bold sm:text-4xl ${c.text}`}>
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
              <p className="mt-3 font-mono text-sm text-cyan/60">{d.tagline}</p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{d.body}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}
