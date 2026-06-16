import Noise from '@/components/reactbits/Noise/Noise'
import Particles from '@/components/reactbits/Particles/Particles'
import { PALETTE } from '@/constants/palette'

/**
 * Fixed, non-interactive atmospheric layers stacked above the 3D city but below
 * the page content: ambient particles (A4), film grain (A5), CRT scanlines and a
 * vignette. The texture here is what keeps the look from reading as a generic
 * smooth-gradient page.
 */
export function Atmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* A4 — ambient drifting particles. Kept sparse + small so they read as
          faint flecks of light, not a blue haze over the city. */}
      <div className="absolute inset-0 opacity-35">
        <Particles
          particleCount={55}
          particleColors={[PALETTE.cyan, PALETTE.magenta, PALETTE.amber]}
          particleSpread={22}
          speed={0.05}
          particleBaseSize={34}
          alphaParticles
          moveParticlesOnHover={false}
          disableRotation={false}
        />
      </div>

      {/* CRT scanlines */}
      <div
        className="absolute inset-0 opacity-25 mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 2px, color-mix(in srgb, var(--color-cyan) 7%, transparent) 2px 3px)',
        }}
      />

      {/* Vignette for depth / focus toward center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 42%, color-mix(in srgb, var(--color-void) 88%, transparent) 100%)',
        }}
      />

      {/* A5 — fine film grain on top of everything */}
      <Noise patternAlpha={12} patternRefreshInterval={5} />
    </div>
  )
}
