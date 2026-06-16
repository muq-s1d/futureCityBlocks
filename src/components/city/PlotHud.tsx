import { DISTRICTS } from '@/constants/city'
import { useAuthStore } from '@/stores/authStore'

/**
 * DOM overlay for the in-world plot view (Build Order #14). Shown once the camera
 * has flown to the user's plot (stage === 'plot'). Reports the plot's identity +
 * claimed/empty state and offers a way back to the city (storefront) or landing.
 * The voxel builder that fills the plot arrives in Phase 2.
 */

// District accent → palette token class (no off-palette hex in components).
const ACCENT: Record<string, string> = {
  neon: 'text-cyan',
  corporate: 'text-amber',
  underground: 'text-magenta',
}

export function PlotHud({
  onBackToCity,
  onBackToLanding,
}: {
  onBackToCity: () => void
  onBackToLanding: () => void
}) {
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const district = DISTRICTS.find((d) => d.id === ownedPlot?.district)
  const accent = ACCENT[ownedPlot?.district ?? ''] ?? 'text-cyan'

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-end pb-14 select-none">
      <div className="hud-panel pointer-events-auto w-full max-w-md px-8 py-6 text-center">
        <div className="font-mono text-[11px] tracking-[0.3em] text-muted uppercase">
          {district?.label ?? 'Your district'}
        </div>
        <div className={`font-display mt-1 text-3xl font-bold tracking-[0.2em] ${accent}`}>
          {ownedPlot ? `PLOT #${ownedPlot.id}` : 'NO PLOT YET'}
        </div>
        <div className="text-readable mx-auto mt-3 max-w-xs font-mono text-xs leading-relaxed tracking-[0.15em] text-muted uppercase">
          {ownedPlot
            ? 'This plot is empty. The voxel builder lands here in Phase 2 — claim it and start building soon.'
            : 'Pick a district at the storefront to stake your claim.'}
        </div>

        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            onClick={onBackToCity}
            className="cursor-target border border-magenta px-6 py-3 font-display text-xs font-bold tracking-[0.25em] text-magenta uppercase transition-colors hover:bg-magenta/10"
          >
            ← Back to the city
          </button>
          <button
            onClick={onBackToLanding}
            className="font-mono text-[11px] tracking-[0.3em] text-cyan/60 uppercase transition-colors hover:text-cyan"
          >
            Landing
          </button>
        </div>
      </div>
    </div>
  )
}
