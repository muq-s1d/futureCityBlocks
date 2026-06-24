import { districtForColumn } from '@/lib/cityGrid'
import { useAuthStore } from '@/stores/authStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'

/**
 * DOM overlay for the in-world plot view (Build Order #14). Shown once the camera
 * has flown to the user's plot (stage === 'plot'). Reports the plot's identity +
 * claimed/empty state, opens the voxel builder, places saved assets, and offers a
 * way back to the city (storefront) or landing.
 */

const ACCENT: Record<string, string> = {
  neon: 'text-cyan',
  corporate: 'text-amber',
  underground: 'text-magenta',
}

export function PlotHud({
  onBackToCity,
  onBackToLanding,
  onEnterBuilder,
  onPlaceAsset,
}: {
  onBackToCity: () => void
  onBackToLanding: () => void
  onEnterBuilder: () => void
  onPlaceAsset: () => void
}) {
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const districts = useWorldConfigStore((s) => s.districts)
  const district = ownedPlot ? districtForColumn(ownedPlot.grid_x, districts) : null
  const accent = ACCENT[district?.id ?? ''] ?? 'text-cyan'

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
            ? 'Your lot. Build a structure in the voxel editor, or drop a saved asset onto the ground.'
            : 'Pick a district at the storefront to stake your claim.'}
        </div>

        {ownedPlot && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={onEnterBuilder}
              className="cursor-target border border-cyan px-7 py-3 font-display text-xs font-bold tracking-[0.25em] text-cyan uppercase transition-colors hover:bg-cyan/10 hover:shadow-glow-cyan"
            >
              ⛏ Build
            </button>
            <button
              onClick={onPlaceAsset}
              className="cursor-target border border-amber px-7 py-3 font-display text-xs font-bold tracking-[0.25em] text-amber uppercase transition-colors hover:bg-amber/10"
            >
              ⊞ Place an asset
            </button>
          </div>
        )}

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
