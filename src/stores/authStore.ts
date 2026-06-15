import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Profile, Plot } from '@/types/db'

interface AuthStore {
  user: User | null
  profile: Profile | null
  ownedPlot: Plot | null
  /** True until the initial session check resolves. */
  initializing: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setOwnedPlot: (plot: Plot | null) => void
  setInitializing: (value: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  ownedPlot: null,
  initializing: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setOwnedPlot: (ownedPlot) => set({ ownedPlot }),
  setInitializing: (initializing) => set({ initializing }),
  reset: () => set({ user: null, profile: null, ownedPlot: null }),
}))
