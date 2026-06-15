import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { RouteFallback } from '@/components/ui/RouteFallback'

/** App shell: a single Suspense boundary around the lazily-loaded routes. */
export function RootLayout() {
  return (
    <div className="min-h-screen bg-void text-cyan">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </div>
  )
}
