import { create } from 'zustand'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { DEFAULT_CITY_CONFIG, DEFAULT_DISTRICTS } from '@/constants/city'
import type { CityConfigValues, DistrictConfig } from '@/types/db'

interface WorldConfigStore {
  cityConfig: CityConfigValues
  districts: readonly DistrictConfig[]
  loaded: boolean
  loadWorldConfig: () => Promise<void>
}

export const useWorldConfigStore = create<WorldConfigStore>((set, get) => ({
  cityConfig: DEFAULT_CITY_CONFIG,
  districts: DEFAULT_DISTRICTS,
  loaded: false,

  loadWorldConfig: async () => {
    if (get().loaded) return
    if (!isSupabaseConfigured) {
      set({ loaded: true })
      return
    }
    const { data, error } = await supabase
      .from('world_configs')
      .select('config, districts')
      .eq('is_active', true)
      .limit(1)
      .single()
    if (error || !data) {
      console.warn('[worldConfig] Failed to load, using defaults:', error?.message)
      set({ loaded: true })
      return
    }
    set({
      cityConfig: data.config as CityConfigValues,
      districts: data.districts as DistrictConfig[],
      loaded: true,
    })
  },
}))
