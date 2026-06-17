/**
 * City data actions. Like lib/auth.ts, Supabase access lives here (not in
 * components) and writes results into the state-only cityStore.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useCityStore } from '@/stores/cityStore'
import { useAuthStore } from '@/stores/authStore'
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

/**
 * Claim the oldest open plot in `district` for the signed-in user (atomic
 * claim_plot RPC). Idempotent: returns the user's existing plot if they already
 * own one. Writes the claimed plot into both the auth store (ownedPlot) and the
 * city store (so the tile flips to claimed). Returns the plot, or throws.
 */
export async function claimPlot(district: string): Promise<Plot> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured — cannot claim a plot.')
  }
  const { data, error } = await supabase.rpc('claim_plot', { p_district: district })
  if (error) throw error
  if (!data) throw new Error('Claim returned no plot.')
  const plot = data as Plot
  useAuthStore.getState().setOwnedPlot(plot)
  useCityStore.getState().upsertPlot(plot)
  return plot
}
