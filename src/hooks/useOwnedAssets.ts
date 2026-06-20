import { useCallback, useEffect, useState } from 'react'
import { loadOwnedAssets } from '@/lib/assets'
import type { Asset } from '@/types/db'

/** The signed-in user's saved assets, with a manual refresh (e.g. after a save). */
export function useOwnedAssets(): { assets: Asset[]; loading: boolean; refresh: () => Promise<void> } {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setAssets(await loadOwnedAssets())
    } catch (err) {
      console.error('loadOwnedAssets failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  return { assets, loading, refresh }
}
