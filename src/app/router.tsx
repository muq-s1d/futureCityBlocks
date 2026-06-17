/* eslint-disable react-refresh/only-export-components --
   This is the router config module; it intentionally exports `router`
   (a non-component) alongside its lazily-imported route components. */
import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './RootLayout'

// Each route component is code-split so its (often heavy, R3F-laden) chunk
// only loads when the route is visited.
// The landing page hosts the whole persistent-canvas experience (auth kiosk →
// storefront → claim → plot), so the old standalone /auth, /city, /plot/:id and
// /dashboard routes were removed. /builder remains as a Phase 2 stub.
const LandingPage = lazy(() => import('./routes/LandingPage'))
const BuilderPage = lazy(() => import('./routes/BuilderPage'))

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'builder', element: <BuilderPage /> },
    ],
  },
])
