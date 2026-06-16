/**
 * City data actions. Like lib/auth.ts, Supabase access lives here (not in
 * components) and writes results into the state-only cityStore.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useCityStore } from '@/stores/cityStore'
import { fallbackPlots } from '@/lib/cityGrid'
import type { Plot } from '@/types/db'

/** Load all plots into the store; falls back to a local grid if the DB is out. */
export async function loadCityPlots(): Promise<void> {
  if (!isSupabaseConfigured) {
    useCityStore.getState().setPlots(fallbackPlots())
    return
  }
  const { data, error } = await supabase.from('plots').select('*').order('id')
  if (error || !data || data.length === 0) {
    useCityStore.getState().setPlots(fallbackPlots())
  } else {
    useCityStore.getState().setPlots(data as Plot[])
  }
}
