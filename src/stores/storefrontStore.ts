import { create } from 'zustand'

/**
 * Transient UI state for the storefront dashboard stage: which display window the
 * user is currently engaging. The structural façade (window lights/frames) and the
 * interactive contents live in separate component trees (Storefront vs.
 * StorefrontDashboard), so they coordinate the "focused window" highlight through
 * this tiny standalone store rather than prop-drilling across the boundary.
 */
export type WindowId = 'account' | 'myplots' | 'soon'

interface StorefrontStore {
  /** The window the pointer is engaging, or null when nothing is focused. */
  focus: WindowId | null
  setFocus: (id: WindowId | null) => void
}

export const useStorefrontStore = create<StorefrontStore>((set) => ({
  focus: null,
  setFocus: (focus) => set({ focus }),
}))
