import { DISTRICTS } from '@/constants/city'
import { useCityStore } from '@/stores/cityStore'
import type { Plot } from '@/types/db'

/**
 * DOM overlay for the city world: district legend, day/night + rain toggles,
 * the hovered-plot readout, and navigation (find-my-plot / back to landing).
 * Pointer events are scoped to the controls so the 3D canvas stays draggable.
 */

const districtLabel = (id: string) => DISTRICTS.find((d) => d.id === id)?.label ?? id

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
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

export function CityHud({
  hoveredPlot,
  ownedPlot,
  onBack,
  onFindMyPlot,
}: {
  hoveredPlot: Plot | null
  ownedPlot: Plot | null
  onBack: () => void
  onFindMyPlot: () => void
}) {
  const timeOfDay = useCityStore((s) => s.timeOfDay)
  const weather = useCityStore((s) => s.weather)
  const toggleTimeOfDay = useCityStore((s) => s.toggleTimeOfDay)
  const toggleWeather = useCityStore((s) => s.toggleWeather)

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Top-left: title + district legend */}
      <div className="absolute top-6 left-6 space-y-3">
        <div className="font-display text-lg font-bold tracking-[0.3em] text-cyan">FUTURECITY</div>
        <div className="font-mono text-[11px] tracking-[0.2em] text-muted uppercase">City Grid · 200 Plots</div>
        <ul className="space-y-1 pt-1">
          {DISTRICTS.map((d) => (
            <li key={d.id} className="flex items-center gap-2 font-mono text-[11px] tracking-[0.15em] uppercase">
              <span className="inline-block h-2 w-2" style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}` }} />
              <span style={{ color: d.color }}>{d.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Top-right: environment toggles */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2">
        <Toggle on={timeOfDay === 'night'} onClick={toggleTimeOfDay}>
          {timeOfDay === 'night' ? '◐ Night' : '◑ Day'}
        </Toggle>
        <Toggle on={weather === 'rain'} onClick={toggleWeather}>
          {weather === 'rain' ? '☂ Rain On' : '☂ Rain Off'}
        </Toggle>
      </div>

      {/* Bottom-left: navigation */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
        {ownedPlot && (
          <button
            onClick={onFindMyPlot}
            className="pointer-events-auto border border-cyan/60 px-3 py-1.5 text-left font-mono text-[11px] tracking-[0.2em] text-cyan uppercase transition-colors hover:bg-cyan/10"
          >
            ⌖ Find my plot
          </button>
        )}
        <button
          onClick={onBack}
          className="pointer-events-auto font-mono text-[11px] tracking-[0.3em] text-cyan/60 uppercase transition-colors hover:text-cyan"
        >
          ← Landing
        </button>
      </div>

      {/* Bottom-center: hovered-plot readout */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        {hoveredPlot ? (
          <div className="border border-cyan/40 bg-void/70 px-5 py-3 text-center backdrop-blur-sm">
            <div className="font-display text-sm font-bold tracking-[0.25em] text-cyan">
              PLOT #{hoveredPlot.id}
              {ownedPlot?.id === hoveredPlot.id && <span className="ml-2 text-amber">· YOURS</span>}
            </div>
            <div className="mt-1 font-mono text-[11px] tracking-[0.2em] text-muted uppercase">
              {districtLabel(hoveredPlot.district)} ·{' '}
              <span className={hoveredPlot.owner_id ? 'text-magenta' : 'text-cyan/70'}>
                {hoveredPlot.owner_id ? 'Claimed' : 'Unclaimed'}
              </span>
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-[0.25em] text-cyan/50 uppercase">Click to enter →</div>
          </div>
        ) : (
          <div className="font-mono text-[11px] tracking-[0.25em] text-muted/70 uppercase">
            Drag to orbit · scroll to zoom · hover a plot
          </div>
        )}
      </div>
    </div>
  )
}
