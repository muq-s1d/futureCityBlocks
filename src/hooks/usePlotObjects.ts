import { useCallback, useEffect, useState } from 'react'
import { loadPlotObjects, type PlacedAsset } from '@/lib/assets'

/**
 * Objects placed on a plot, refetched on plot change and on demand (after a
 * placement). This is the "stub now" half of the Realtime decision: Phase 2
 * keeps the owner's own plot fresh by refetching; Phase 3 swaps in
 * subscribeToPlotObjects for live multi-user updates.
 */
export function usePlotObjects(plotId: number | null): {
  objects: PlacedAsset[]
  refresh: () => Promise<void>
} {
  const [objects, setObjects] = useState<PlacedAsset[]>([])

  const refresh = useCallback(async () => {
    if (plotId == null) {
      setObjects([])
      return
    }
    try {
      setObjects(await loadPlotObjects(plotId))
    } catch (err) {
      console.error('loadPlotObjects failed', err)
    }
  }, [plotId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  return { objects, refresh }
}
