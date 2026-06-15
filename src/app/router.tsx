/* eslint-disable react-refresh/only-export-components --
   This is the router config module; it intentionally exports `router`
   (a non-component) alongside its lazily-imported route components. */
import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './RootLayout'

// Each route component is code-split so its (often heavy, R3F-laden) chunk
// only loads when the route is visited.
const LandingPage = lazy(() => import('./routes/LandingPage'))
const AuthPage = lazy(() => import('./routes/AuthPage'))
const CityPage = lazy(() => import('./routes/CityPage'))
const PlotPage = lazy(() => import('./routes/PlotPage'))
const BuilderPage = lazy(() => import('./routes/BuilderPage'))
const DashboardPage = lazy(() => import('./routes/DashboardPage'))

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'auth', element: <AuthPage /> },
      { path: 'city', element: <CityPage /> },
      { path: 'plot/:id', element: <PlotPage /> },
      { path: 'builder', element: <BuilderPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
    ],
  },
])
