import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useCityStore } from '@/stores/cityStore'
import { fallbackPlots } from '@/lib/cityGrid'
import { CityScene } from '@/components/city/CityScene.r3f'
import { CityHud } from '@/components/city/CityHud'
import type { Plot } from '@/types/db'

/**
 * The city world route (Build Order #13): loads the 200-plot grid, renders the
 * R3F city + DOM HUD, and flies the camera to the player's owned plot. Falls back
 * to a locally-generated grid if the DB is unconfigured/unreachable so the world
 * always renders; redirects unauthenticated visitors to /auth.
 */
export default function CityPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const initializing = useAuthStore((s) => s.initializing)
  const plots = useCityStore((s) => s.plots)
  const setPlots = useCityStore((s) => s.setPlots)

  const [hoveredPlot, setHoveredPlot] = useState<Plot | null>(null)
  const [flyToken, setFlyToken] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      if (!isSupabaseConfigured) {
        setPlots(fallbackPlots())
        return
      }
      const { data, error } = await supabase.from('plots').select('*').order('id')
      if (!active) return
      if (error || !data || data.length === 0) setPlots(fallbackPlots())
      else setPlots(data as Plot[])
    }
    void load()
    return () => {
      active = false
    }
  }, [setPlots])

  // Gate the world behind auth (only once the session check has resolved).
  if (isSupabaseConfigured && !initializing && !user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-void ${hoveredPlot ? 'cursor-pointer' : ''}`}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ fov: 55, near: 0.1, far: 1500, position: [0, 200, 180] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <CityScene
            plots={plots}
            ownedPlot={ownedPlot}
            flyToken={flyToken}
            onHoverChange={setHoveredPlot}
            onSelectPlot={(p) => navigate(`/plot/${p.id}`)}
          />
        </Suspense>
      </Canvas>

      <CityHud
        hoveredPlot={hoveredPlot}
        ownedPlot={ownedPlot}
        onBack={() => navigate('/')}
        onFindMyPlot={() => setFlyToken((t) => t + 1)}
      />
    </div>
  )
}
