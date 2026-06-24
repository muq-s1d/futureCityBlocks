/**
 * Default city grid + district configuration, used as fallback when Supabase is
 * unavailable. At runtime the active values come from the `world_configs` table
 * via `worldConfigStore`. These defaults match the DB seed (migration 0008).
 *
 * District `color` values are literal hexes (not CSS tokens) because three.js
 * fog/material colors require real color values at the WebGL layer.
 */
import type { CityConfigValues, DistrictConfig } from '@/types/db'

export const DEFAULT_CITY_CONFIG: CityConfigValues = {
  GRID_COLS: 20,
  GRID_ROWS: 10,
  TOTAL_PLOTS: 200,
  PLOT_SIZE: 10,
  LOT: 25,
  ALLEY: 6,
  STREET: 42,
  CORRIDOR_HALF: 15,
  NEAR: 172,
  BLOCK_COLS: 2,
  BLOCK_ROWS: 5,
}

export const DEFAULT_DISTRICTS: readonly DistrictConfig[] = [
  { id: 'neon', label: 'Neon District', color: '#00ffe7', gridRange: { xMin: 0, xMax: 6 } },
  { id: 'corporate', label: 'Corporate Zone', color: '#ffd700', gridRange: { xMin: 7, xMax: 12 } },
  { id: 'underground', label: 'Underground', color: '#ff2d78', gridRange: { xMin: 13, xMax: 19 } },
]

/** District whose x-range contains the given grid column. */
export function districtForColumn(gridX: number, districts: readonly DistrictConfig[] = DEFAULT_DISTRICTS): DistrictConfig {
  const found = districts.find(
    (d) => gridX >= d.gridRange.xMin && gridX <= d.gridRange.xMax,
  )
  return found ?? districts[0]!
}

