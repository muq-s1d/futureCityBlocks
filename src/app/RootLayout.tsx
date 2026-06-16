import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { RouteFallback } from '@/components/ui/RouteFallback'
import { useAuthSession } from '@/hooks/useAuthSession'

/** App shell: a single Suspense boundary around the lazily-loaded routes. */
export function RootLayout() {
  // Resolve + track the Supabase session for the whole app.
  useAuthSession()

  return (
    <div className="min-h-screen bg-void text-cyan">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  )
}
