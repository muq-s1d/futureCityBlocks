/**
 * Grid <-> world-space math for the city. Pure functions parameterized by config
 * so the layout adapts to whatever world_configs row is active.
 */
import { DEFAULT_CITY_CONFIG, DEFAULT_DISTRICTS, districtForColumn } from '@/constants/city'
import type { CityConfigValues, DistrictConfig, Plot } from '@/types/db'

function blockOffset(li: number, blockSize: number, lot: number, alley: number, street: number): number {
  let m = lot / 2
  for (let k = 1; k <= li; k++) {
    m += lot + (k % blockSize === 0 ? street : alley)
  }
  return m
}

export function plotWorldX(gridX: number, cfg: CityConfigValues = DEFAULT_CITY_CONFIG): number {
  const sideHalf = cfg.GRID_COLS / 2
  const left = gridX < sideHalf
  const li = left ? sideHalf - 1 - gridX : gridX - sideHalf
  const mag = cfg.CORRIDOR_HALF + cfg.STREET + blockOffset(li, cfg.BLOCK_COLS, cfg.LOT, cfg.ALLEY, cfg.STREET)
  return left ? -mag : mag
}

export function plotWorldZ(gridZ: number, cfg: CityConfigValues = DEFAULT_CITY_CONFIG): number {
  return -(cfg.NEAR + blockOffset(gridZ, cfg.BLOCK_ROWS, cfg.LOT, cfg.ALLEY, cfg.STREET))
}

export function cityHalfWidth(cfg: CityConfigValues = DEFAULT_CITY_CONFIG): number {
  const sideHalf = cfg.GRID_COLS / 2
  return cfg.CORRIDOR_HALF + cfg.STREET + blockOffset(sideHalf - 1, cfg.BLOCK_COLS, cfg.LOT, cfg.ALLEY, cfg.STREET) + cfg.LOT / 2
}

export function cityHalfDepth(cfg: CityConfigValues = DEFAULT_CITY_CONFIG): number {
  return (cfg.NEAR + blockOffset(cfg.GRID_ROWS - 1, cfg.BLOCK_ROWS, cfg.LOT, cfg.ALLEY, cfg.STREET) + cfg.LOT) / 2
}

export function fallbackPlots(
  cfg: CityConfigValues = DEFAULT_CITY_CONFIG,
  districts: readonly DistrictConfig[] = DEFAULT_DISTRICTS,
): Plot[] {
  const out: Plot[] = []
  let id = 1
  for (let gx = 0; gx < cfg.GRID_COLS; gx++) {
    for (let gz = 0; gz < cfg.GRID_ROWS; gz++) {
      out.push({
        id: id++,
        owner_id: null,
        grid_x: gx,
        grid_z: gz,
        name: 'Unclaimed Plot',
        claimed_at: null,
        voxel_data: [],
      })
    }
  }
  return out
}

// Re-export for convenience
export { districtForColumn }
