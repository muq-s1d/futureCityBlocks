/**
 * Auth actions for FutureCity. These wrap Supabase Auth + the profiles/plots
 * tables and keep the (state-only) authStore in sync. UI calls these; the
 * store never imports Supabase itself.
 */
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Plot, Profile } from '@/types/db'

/** Load the user's profile + owned plot into the store. */
export async function loadProfileAndPlot(userId: string): Promise<void> {
  const [{ data: profile }, { data: plots }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('plots').select('*').eq('owner_id', userId).order('id').limit(1),
  ])
  useAuthStore.getState().setProfile((profile as Profile) ?? null)
  useAuthStore.getState().setOwnedPlot((plots?.[0] as Plot) ?? null)
}

/** Sign up with email/password. Auto-confirm is on, so a session is returned
 *  immediately and the DB trigger has already created the profile. The user owns
 *  no plot yet — they claim one from the storefront (see lib/city claimPlot). */
export async function signUpWithEmail(
  email: string,
  password: string,
  username?: string,
): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: username?.trim() ? { data: { username: username.trim() } } : undefined,
  })
  if (error) throw error
  if (data.user) await loadProfileAndPlot(data.user.id)
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (data.user) await loadProfileAndPlot(data.user.id)
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
  useAuthStore.getState().reset()
}

/** Permanently delete the current user's account (RPC = SECURITY DEFINER
 *  delete_user). Releases their plot back to the pool, then signs out. */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_user')
  if (error) throw error
  await supabase.auth.signOut()
  useAuthStore.getState().reset()
}
