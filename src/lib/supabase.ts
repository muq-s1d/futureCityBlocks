import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True only when both env vars are present. UI can use this to show a
 * "configure Supabase" notice instead of firing requests that will 401.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. ' +
      'Auth and DB calls will fail until .env.local is filled in.',
  )
}

// Fall back to a syntactically-valid placeholder so the module can be imported
// before Supabase is configured (e.g. on the landing page) without throwing.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'public-anon-key',
)
