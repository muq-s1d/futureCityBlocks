import { useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { loadProfileAndPlot } from '@/lib/auth'

/**
 * Bootstraps and tracks the Supabase auth session for the whole app. Mounted
 * once (in RootLayout): resolves the initial session, then listens for sign
 * in / out. Profile + plot loads are deferred out of the onAuthStateChange
 * callback (Supabase warns against calling its client from inside it).
 */
export function useAuthSession(): void {
  useEffect(() => {
    if (!isSupabaseConfigured) {
      useAuthStore.getState().setInitializing(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null
      useAuthStore.getState().setUser(user)
      if (user) await loadProfileAndPlot(user.id)
      if (active) useAuthStore.getState().setInitializing(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      useAuthStore.getState().setUser(user)
      if (user) {
        // Defer: avoid re-entrant Supabase calls inside this callback.
        setTimeout(() => {
          loadProfileAndPlot(user.id)
        }, 0)
      } else {
        useAuthStore.getState().reset()
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])
}
