import { useOwnedAssets } from '@/hooks/useOwnedAssets'
import { NeonButton } from '@/components/ui/NeonButton'
import type { Asset } from '@/types/db'

/**
 * The signed-in user's saved assets as a thumbnail grid. Behaviour is decided by
 * the caller via onPick:
 *   - from the builder pause menu → load the asset back into the editor (edit),
 *   - from the plot HUD → arm a placement on the plot (place).
 * The panel itself is mode-agnostic; only the title + onPick differ.
 */
export function AssetLibraryPanel({
  title,
  hint,
  onPick,
  onClose,
}: {
  title: string
  hint: string
  onPick: (asset: Asset) => void
  onClose: () => void
}) {
  const { assets, loading } = useOwnedAssets()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-library-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
    >
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="hud-panel relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-sm p-7">
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="asset-library-title"
              className="font-display text-2xl font-bold tracking-wide text-cyan"
            >
              {title}
            </h2>
            <p className="mt-2 font-mono text-[11px] tracking-[0.15em] text-muted uppercase">{hint}</p>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs tracking-[0.25em] text-cyan/60 uppercase transition-colors hover:text-cyan"
          >
            Close ✕
          </button>
        </div>

        <div className="mt-6 min-h-32 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center font-mono text-xs tracking-[0.2em] text-muted uppercase">
              Loading assets…
            </p>
          ) : assets.length === 0 ? (
            <p className="py-10 text-center font-mono text-xs tracking-[0.2em] text-muted uppercase">
              No assets yet — build one and save it.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => onPick(asset)}
                  className="group flex flex-col border border-border bg-void/40 transition-colors hover:border-cyan"
                >
                  <div className="aspect-square w-full overflow-hidden bg-void/60">
                    {asset.thumbnail ? (
                      <img
                        src={asset.thumbnail}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-mono text-[10px] text-muted uppercase">
                        no preview
                      </div>
                    )}
                  </div>
                  <span className="truncate px-3 py-2 text-left font-mono text-xs tracking-[0.1em] text-cyan/80 group-hover:text-cyan">
                    {asset.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <NeonButton accent="cyan" onClick={onClose} className="px-6 py-3 text-xs">
            Done
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
