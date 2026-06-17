import { create } from 'zustand'
import type { Plot } from '@/types/db'

type TimeOfDay = 'day' | 'night'
type Weather = 'clear' | 'rain'

interface CityStore {
  plots: Plot[]
  selectedPlot: Plot | null
  timeOfDay: TimeOfDay
  weather: Weather
  setPlots: (plots: Plot[]) => void
  /** Replace one plot in place (e.g. after it's claimed). */
  upsertPlot: (plot: Plot) => void
  setSelectedPlot: (plot: Plot | null) => void
  toggleTimeOfDay: () => void
  toggleWeather: () => void
}

export const useCityStore = create<CityStore>((set) => ({
  plots: [],
  selectedPlot: null,
  timeOfDay: 'night', // city defaults to night; rain is on by default
  weather: 'rain',
  setPlots: (plots) => set({ plots }),
  upsertPlot: (plot) =>
    set((s) => ({ plots: s.plots.map((p) => (p.id === plot.id ? plot : p)) })),
  setSelectedPlot: (selectedPlot) => set({ selectedPlot }),
  toggleTimeOfDay: () =>
    set((s) => ({ timeOfDay: s.timeOfDay === 'day' ? 'night' : 'day' })),
  toggleWeather: () =>
    set((s) => ({ weather: s.weather === 'rain' ? 'clear' : 'rain' })),
}))
