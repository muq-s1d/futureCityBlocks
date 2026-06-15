import Noise from '@/components/reactbits/Noise/Noise'
import Particles from '@/components/reactbits/Particles/Particles'
import PixelTrail from '@/components/reactbits/PixelTrail/PixelTrail'
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
      {/* A4 — ambient drifting particles */}
      <div className="absolute inset-0 opacity-60">
        <Particles
          particleCount={140}
          particleColors={[PALETTE.cyan, PALETTE.magenta, PALETTE.amber]}
          particleSpread={14}
          speed={0.06}
          particleBaseSize={60}
          alphaParticles
          moveParticlesOnHover={false}
          disableRotation={false}
        />
      </div>

      {/* Pixel trail following the cursor, over the city but under the content */}
      <div className="absolute inset-0 opacity-70">
        <PixelTrail
          gridSize={60}
          trailSize={0.1}
          maxAge={260}
          interpolate={5}
          color={PALETTE.cyan}
          gooeyFilter={{ id: 'fc-goo', strength: 2 }}
        />
      </div>

      {/* CRT scanlines */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
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
      <Noise patternAlpha={14} patternRefreshInterval={3} />
    </div>
  )
}
