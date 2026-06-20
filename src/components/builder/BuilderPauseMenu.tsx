import { useState } from 'react'
import { NeonButton } from '@/components/ui/NeonButton'
import { NameAssetDialog } from '@/components/ui/NameAssetDialog'
import { AssetLibraryPanel } from '@/components/builder/AssetLibraryPanel'
import { useBuilderStore } from '@/stores/builderStore'
import type { Asset } from '@/types/db'

/**
 * Builder pause menu — shown whenever pointer lock is lost after the player has
 * engaged at least once (every Escape/blur reliably lands here, since lock loss
 * is detected via pointerlockchange). The scratch buffer is untouched while
 * paused, so Resume drops straight back into the same build.
 */
export function BuilderPauseMenu({ onExit }: { onExit: () => void }) {
  const locked = useBuilderStore((s) => s.locked)
  const engaged = useBuilderStore((s) => s.engaged)
  const requestLock = useBuilderStore((s) => s.requestLock)
  const loadBlocks = useBuilderStore((s) => s.loadBlocks)
  const blockCount = useBuilderStore((s) => s.blocks.length)
  const [saveOpen, setSaveOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  // Hidden while locked, and before the very first engagement (BuilderHud shows
  // the CLICK TO BUILD prompt then instead).
  if (locked || !engaged) return null

  const loadToEdit = (asset: Asset) => {
    loadBlocks(asset.voxel_data)
    setLibraryOpen(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" aria-hidden />
        <div className="hud-panel relative z-10 w-full max-w-sm rounded-sm p-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-[0.2em] text-cyan uppercase">
            Paused
          </h2>
          <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            {blockCount} block{blockCount === 1 ? '' : 's'} in this build
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <NeonButton accent="cyan" onClick={() => requestLock?.()} className="justify-center py-3 text-xs">
              ▶ Resume building
            </NeonButton>
            <NeonButton
              accent="cyan"
              onClick={() => setSaveOpen(true)}
              disabled={blockCount === 0}
              className="justify-center py-3 text-xs"
            >
              ⬡ Save as…
            </NeonButton>
            <NeonButton
              accent="cyan"
              onClick={() => setLibraryOpen(true)}
              className="justify-center py-3 text-xs"
            >
              ⊞ Asset library
            </NeonButton>
            <NeonButton accent="magenta" onClick={onExit} className="justify-center py-3 text-xs">
              ✕ Exit to plot
            </NeonButton>
          </div>
        </div>
      </div>

      <NameAssetDialog open={saveOpen} onClose={() => setSaveOpen(false)} />

      {libraryOpen && (
        <AssetLibraryPanel
          title="Load to edit"
          hint="Pick a saved asset to load it into the editor"
          onPick={loadToEdit}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </>
  )
}
