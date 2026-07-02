import { useEffect, useRef, useState } from 'react'
import { NeonButton } from '@/components/ui/NeonButton'
import { useBuilderStore } from '@/stores/builderStore'
import { updateAsset } from '@/lib/assets'
import type { Asset } from '@/types/db'

export function NameAssetDialog({
  open,
  onClose,
  onSaved,
  editingAsset,
}: {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  editingAsset?: Asset | null
}) {
  const saveAsset = useBuilderStore((s) => s.saveAsset)
  const blocks = useBuilderStore((s) => s.blocks)
  const capture = useBuilderStore((s) => s.capture)
  const blockCount = blocks.length
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(editingAsset?.name ?? '')
    setError(null)
    setBusy(false)
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const canSave = name.trim().length > 0 && blockCount > 0 && !busy

  const finish = () => {
    setBusy(false)
    onSaved?.()
    onClose()
  }

  const handleError = (err: unknown) => {
    console.error('save failed', err)
    setError(err instanceof Error ? err.message : 'Save failed — try again.')
    setBusy(false)
  }

  const handleOverwrite = () => {
    if (!canSave || !editingAsset) return
    setBusy(true)
    setError(null)
    const thumbnail = capture?.() ?? ''
    updateAsset(editingAsset.id, name.trim(), blocks, thumbnail)
      .then(() => {
        useBuilderStore.getState().clearAll()
        finish()
      })
      .catch(handleError)
  }

  const handleSaveNew = () => {
    if (!canSave) return
    setBusy(true)
    setError(null)
    saveAsset(name.trim()).then(finish).catch(handleError)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-asset-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
    >
      <div
        className="absolute inset-0 bg-void/80 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div className="hud-panel relative z-10 w-full max-w-md rounded-sm p-7">
        <h2 id="save-asset-title" className="font-display text-2xl font-bold tracking-wide text-cyan">
          {editingAsset ? 'Save changes' : 'Save asset'}
        </h2>
        <p className="mt-3 font-mono text-xs leading-relaxed tracking-[0.1em] text-muted uppercase">
          {editingAsset
            ? `Editing "${editingAsset.name}" — overwrite the original or save as a new asset.`
            : `Name this ${blockCount}-block structure. It becomes a reusable template in your Asset Library.`}
        </p>

        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (editingAsset ? handleOverwrite() : handleSaveNew())}
          maxLength={48}
          placeholder="e.g. Neon Spire"
          className="mt-5 w-full border border-border bg-void/60 px-4 py-3 font-mono text-sm text-cyan placeholder:text-muted focus:border-cyan focus:outline-none"
        />

        {error && <p className="mt-3 font-mono text-xs text-magenta">{error}</p>}

        <div className="mt-7 flex justify-end gap-3">
          <NeonButton accent="cyan" onClick={onClose} disabled={busy} className="px-6 py-3 text-xs">
            Cancel
          </NeonButton>
          {editingAsset && (
            <NeonButton
              accent="amber"
              onClick={handleOverwrite}
              disabled={!canSave}
              className="px-6 py-3 text-xs"
            >
              {busy ? 'Saving…' : `Overwrite "${editingAsset.name}"`}
            </NeonButton>
          )}
          <NeonButton
            accent="cyan"
            onClick={handleSaveNew}
            disabled={!canSave}
            className="px-6 py-3 text-xs"
          >
            {busy ? 'Saving…' : 'Save as new'}
          </NeonButton>
        </div>
      </div>
    </div>
  )
}
