import { useEffect } from 'react'
import { BLOCK_COLOR, BLOCK_LABEL, BLOCK_TYPES } from '@/constants/builder'
import { useBuilderStore } from '@/stores/builderStore'

/**
 * DOM overlay for the voxel builder: a centre crosshair (only while locked), the
 * 7-slot hotbar (click, or number keys 1–7), and the first-run "CLICK TO BUILD"
 * prompt that requests pointer lock (a real user gesture — see BuilderScene).
 */
export function BuilderHud() {
  const locked = useBuilderStore((s) => s.locked)
  const engaged = useBuilderStore((s) => s.engaged)
  const selected = useBuilderStore((s) => s.selectedBlockType)
  const setSelected = useBuilderStore((s) => s.setSelectedBlockType)
  const requestLock = useBuilderStore((s) => s.requestLock)

  // Number keys 1–7 select the hotbar slot (works while pointer-locked too).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number.parseInt(e.key, 10)
      if (n >= 1 && n <= BLOCK_TYPES.length) setSelected(BLOCK_TYPES[n - 1]!)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelected])

  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none">
      {/* Crosshair */}
      {locked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="absolute h-5 w-px -translate-x-1/2 -translate-y-1/2 bg-cyan/80" />
          <div className="absolute h-px w-5 -translate-x-1/2 -translate-y-1/2 bg-cyan/80" />
        </div>
      )}

      {/* First-run prompt — clicking anywhere requests pointer lock. */}
      {!locked && !engaged && (
        <button
          onClick={() => requestLock?.()}
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void/40 backdrop-blur-[2px]"
        >
          <span className="font-display text-3xl font-bold tracking-[0.3em] text-cyan uppercase">
            Click to build
          </span>
          <span className="max-w-md text-center font-mono text-xs leading-relaxed tracking-[0.2em] text-cyan/70 uppercase">
            WASD to fly · mouse to look · space / shift up &amp; down · left-click breaks ·
            right-click places · 1–7 pick block · esc to pause
          </span>
        </button>
      )}

      {/* Hotbar */}
      <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1.5">
        {BLOCK_TYPES.map((type, i) => {
          const active = type === selected
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              title={`${i + 1} · ${BLOCK_LABEL[type]}`}
              className={`relative flex h-12 w-12 items-center justify-center border transition-colors ${
                active ? 'border-cyan bg-cyan/10' : 'border-border bg-void/60 hover:border-cyan/50'
              }`}
            >
              <span
                className="h-6 w-6 rounded-sm border border-white/10"
                style={{ backgroundColor: BLOCK_COLOR[type] }}
              />
              <span className="absolute top-0.5 left-1 font-mono text-[9px] text-cyan/70">
                {i + 1}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
