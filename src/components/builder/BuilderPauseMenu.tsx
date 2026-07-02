import { useState } from 'react'
import { NeonButton } from '@/components/ui/NeonButton'
import { NameAssetDialog } from '@/components/ui/NameAssetDialog'
import { AssetLibraryPanel } from '@/components/builder/AssetLibraryPanel'
import { useBuilderStore } from '@/stores/builderStore'
import type { Asset } from '@/types/db'

export function BuilderPauseMenu({ onExit }: { onExit: () => void }) {
  const locked = useBuilderStore((s) => s.locked)
  const engaged = useBuilderStore((s) => s.engaged)
  const requestLock = useBuilderStore((s) => s.requestLock)
  const mode = useBuilderStore((s) => s.mode)
  const setMode = useBuilderStore((s) => s.setMode)
  const loadBlocks = useBuilderStore((s) => s.loadBlocks)
  const setEditingAsset = useBuilderStore((s) => s.setEditingAsset)
  const editingAsset = useBuilderStore((s) => s.editingAsset)
  const armAsset = useBuilderStore((s) => s.armAsset)
  const blockCount = useBuilderStore((s) => s.blocks.length)
  const showLibrary = useBuilderStore((s) => s.showLibrary)
  const [saveOpen, setSaveOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(showLibrary)

  if (locked || !engaged) return null

  if (showLibrary) {
    useBuilderStore.setState({ showLibrary: false })
    if (!libraryOpen) setLibraryOpen(true)
  }

  const isTemplate = mode === 'template'

  const loadToEdit = (asset: Asset) => {
    if (isTemplate) {
      loadBlocks(asset.voxel_data)
      setEditingAsset(asset)
    }
    setLibraryOpen(false)
    requestLock?.()
  }

  const pickToPlace = (asset: Asset) => {
    armAsset(asset)
    setLibraryOpen(false)
    requestLock?.()
  }

  const enterTemplateMode = () => {
    setMode('template')
    requestLock?.()
  }

  const exitTemplateMode = () => {
    setMode('build')
    requestLock?.()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-void/70 backdrop-blur-sm" aria-hidden />
        <div className="hud-panel relative z-10 w-full max-w-sm rounded-sm p-8 text-center">
          <h2 className="font-display text-3xl font-bold tracking-[0.2em] text-cyan uppercase">
            {isTemplate ? 'Asset Builder' : 'Paused'}
          </h2>
          <p className="mt-2 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
            {isTemplate
              ? `${blockCount} block${blockCount === 1 ? '' : 's'} in template`
              : `${blockCount} block${blockCount === 1 ? '' : 's'} on plot`}
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <NeonButton accent="cyan" onClick={() => requestLock?.()} className="justify-center py-3 text-xs">
              ▶ Resume
            </NeonButton>

            {isTemplate ? (
              <>
                <NeonButton
                  accent="cyan"
                  onClick={() => setSaveOpen(true)}
                  disabled={blockCount === 0}
                  className="justify-center py-3 text-xs"
                >
                  ⬡ Save template as…
                </NeonButton>
                <NeonButton
                  accent="cyan"
                  onClick={() => setLibraryOpen(true)}
                  className="justify-center py-3 text-xs"
                >
                  ⊞ Load template to edit
                </NeonButton>
                <NeonButton accent="amber" onClick={exitTemplateMode} className="justify-center py-3 text-xs">
                  ← Back to build mode
                </NeonButton>
              </>
            ) : (
              <>
                <NeonButton
                  accent="cyan"
                  onClick={() => setLibraryOpen(true)}
                  className="justify-center py-3 text-xs"
                >
                  ⊞ Place an asset
                </NeonButton>
                <NeonButton accent="amber" onClick={enterTemplateMode} className="justify-center py-3 text-xs">
                  ⛏ Create asset template
                </NeonButton>
                <NeonButton accent="magenta" onClick={onExit} className="justify-center py-3 text-xs">
                  ✕ Save &amp; exit to plot
                </NeonButton>
              </>
            )}
          </div>
        </div>
      </div>

      {isTemplate && (
        <NameAssetDialog open={saveOpen} onClose={() => setSaveOpen(false)} editingAsset={editingAsset} />
      )}

      {libraryOpen && (
        <AssetLibraryPanel
          title={isTemplate ? 'Load template' : 'Place an asset'}
          hint={isTemplate ? 'Pick a template to load into the editor' : 'Pick an asset to stamp onto your plot'}
          onPick={isTemplate ? loadToEdit : pickToPlace}
          onClose={() => setLibraryOpen(false)}
          allowDelete
        />
      )}
    </>
  )
}
