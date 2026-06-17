import { create } from 'zustand'

/**
 * Adaptive render-quality tier for the 3D world. A cheap startup heuristic picks
 * an initial tier (so low-end devices never even mount the heavy effects), and a
 * drei <PerformanceMonitor> can step it down at runtime if the framerate sags —
 * 60fps is a hard requirement, premium polish is best-effort on top of it.
 *
 * Per-tier capability flags live in QUALITY so components read one source of
 * truth instead of scattering `tier === 'high'` checks.
 */
export type QualityTier = 'low' | 'med' | 'high'

export interface QualityCaps {
  /** Upper bound of the canvas device-pixel-ratio range. */
  dprMax: number
  /** Selective neon bloom (postprocessing). */
  bloom: boolean
  /** Real-time mirror floor (drei MeshReflectorMaterial) vs a plain glossy slab. */
  reflectiveFloor: boolean
  /** Floor reflector resolution when reflectiveFloor is on. */
  reflectorRes: number
  /** Drifting steam sprite count (0 = none). */
  steam: number
  /** Distant flying-vehicle count (0 = none). */
  vehicles: number
  /** Animated/scanline holograms vs static emissive panels. */
  animatedHolograms: boolean
}

export const QUALITY: Record<QualityTier, QualityCaps> = {
  low: {
    dprMax: 1,
    bloom: false,
    reflectiveFloor: false,
    reflectorRes: 0,
    steam: 0,
    vehicles: 0,
    animatedHolograms: false,
  },
  med: {
    dprMax: 1.5,
    bloom: true,
    reflectiveFloor: true,
    reflectorRes: 256,
    steam: 12,
    vehicles: 2,
    animatedHolograms: true,
  },
  high: {
    dprMax: 2,
    bloom: true,
    reflectiveFloor: true,
    reflectorRes: 512,
    steam: 24,
    vehicles: 4,
    animatedHolograms: true,
  },
}

/** Cheap one-shot guess from CPU cores, DPR and a coarse mobile sniff. */
function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'high'
  const cores = navigator.hardwareConcurrency ?? 4
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  if (mobile || cores <= 4) return 'low'
  if (cores >= 8 && dpr <= 2.5) return 'high'
  return 'med'
}

const ORDER: QualityTier[] = ['low', 'med', 'high']

interface QualityStore {
  tier: QualityTier
  /** True once a runtime downgrade has fired, so we don't bounce back up. */
  pinned: boolean
  /** True once the user picks a tier by hand — auto-downgrade then stays off. */
  manual: boolean
  /** User-chosen tier (HUD). Pins it so PerformanceMonitor won't override. */
  setTier: (tier: QualityTier) => void
  /** Step down one tier (PerformanceMonitor onDecline). No-op at 'low' or manual. */
  downgrade: () => void
}

export const useQualityStore = create<QualityStore>((set) => ({
  tier: detectTier(),
  pinned: false,
  manual: false,
  setTier: (tier) => set({ tier, pinned: true, manual: true }),
  downgrade: () =>
    set((s) => {
      if (s.manual) return s
      const i = ORDER.indexOf(s.tier)
      return i > 0 ? { tier: ORDER[i - 1]!, pinned: true } : { pinned: true }
    }),
}))

/** Convenience selector for the active tier's capability flags. */
export function useQualityCaps(): QualityCaps {
  const tier = useQualityStore((s) => s.tier)
  return QUALITY[tier]
}
