import { useCityStore } from '@/stores/cityStore'
import { useQualityStore, type QualityTier } from '@/stores/qualityStore'

/**
 * Minimal environment HUD for the persistent-canvas city: day/night + rain
 * toggles plus a graphics tier picker, top-right. Mounted while the user is in
 * the city stages (dashboard / plot). Pointer events are scoped to the buttons
 * so the 3D canvas underneath stays interactive.
 */

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`pointer-events-auto border px-3 py-1.5 font-mono text-[11px] tracking-[0.2em] uppercase transition-colors ${
        on
          ? 'border-cyan bg-cyan/10 text-cyan'
          : 'border-border text-muted hover:border-cyan/50 hover:text-cyan/80'
      }`}
    >
      {children}
    </button>
  )
}

const TIERS: { tier: QualityTier; label: string }[] = [
  { tier: 'low', label: 'Low' },
  { tier: 'med', label: 'Med' },
  { tier: 'high', label: 'High' },
]

export function EnvHud() {
  const timeOfDay = useCityStore((s) => s.timeOfDay)
  const weather = useCityStore((s) => s.weather)
  const toggleTimeOfDay = useCityStore((s) => s.toggleTimeOfDay)
  const toggleWeather = useCityStore((s) => s.toggleWeather)
  const tier = useQualityStore((s) => s.tier)
  const setTier = useQualityStore((s) => s.setTier)

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-50 flex flex-col items-end gap-2 select-none">
      <Toggle on={timeOfDay === 'night'} onClick={toggleTimeOfDay}>
        {timeOfDay === 'night' ? '◐ Night' : '◑ Day'}
      </Toggle>
      <Toggle on={weather === 'rain'} onClick={toggleWeather}>
        {weather === 'rain' ? '☂ Rain On' : '☂ Rain Off'}
      </Toggle>
      {/* Graphics tier — segmented; picking one pins it (no auto-downgrade). */}
      <div className="mt-1 flex flex-col items-end gap-1">
        <span className="font-mono text-[9px] tracking-[0.25em] text-muted uppercase">
          Graphics
        </span>
        <div className="pointer-events-auto flex border border-border">
          {TIERS.map(({ tier: t, label }) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`px-2.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors ${
              tier === t
                ? 'bg-cyan/15 text-cyan'
                : 'text-muted hover:text-cyan/80'
            } ${t !== 'low' ? 'border-l border-border' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
