import { create } from 'zustand'

/**
 * The single persistent-canvas flow stage. The camera and DOM overlays key off
 * this as the user moves through one continuous world:
 *   landing (scroll) → auth (kiosk) → dashboard (storefront) → plot (their lot).
 */
export type WorldStage = 'landing' | 'auth' | 'dashboard' | 'plot'

interface WorldStore {
  stage: WorldStage
  setStage: (stage: WorldStage) => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  stage: 'landing',
  setStage: (stage) => set({ stage }),
}))
