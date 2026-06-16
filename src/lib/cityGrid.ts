/**
 * Grid ↔ world-space math for the city. The 20×10 plot grid is laid out as a
 * lot-and-block neighborhood (see CITY_CONFIG): a central highway runs along −z,
 * with blocks of lots flanking BOTH sides. Columns 0–9 sit left of the highway,
 * 10–19 to the right; rows run away into depth. Within a block lots are split by
 * a thin ALLEY, blocks by a wider STREET.
 */
import { CITY_CONFIG, districtForColumn } from '@/constants/city'
import type { Plot } from '@/types/db'

const { LOT, ALLEY, STREET, CORRIDOR_HALF, NEAR, BLOCK_COLS, BLOCK_ROWS, GRID_COLS, GRID_ROWS } =
  CITY_CONFIG

/**
 * Distance from the run's start to the centre of the lot at local index `li`,
 * accumulating each lot footprint plus an ALLEY within a block and a STREET when
 * a new block begins (every `blockSize` lots).
 */
function blockOffset(li: number, blockSize: number): number {
  let m = LOT / 2
  for (let k = 1; k <= li; k++) {
    m += LOT + (k % blockSize === 0 ? STREET : ALLEY)
  }
  return m
}

/** Half the grid width counted from the highway centre out to the last column. */
const SIDE_HALF = GRID_COLS / 2

/** World X for a grid column: mirrored blocks flanking the central highway. */
export function plotWorldX(gridX: number): number {
  const left = gridX < SIDE_HALF
  // Local index outward from the highway edge (0 = lot nearest the road).
  const li = left ? SIDE_HALF - 1 - gridX : gridX - SIDE_HALF
  const mag = CORRIDOR_HALF + STREET + blockOffset(li, BLOCK_COLS)
  return left ? -mag : mag
}

/** World Z for a grid row: blocks marching away from the entrance into −z. */
export function plotWorldZ(gridZ: number): number {
  return -(NEAR + blockOffset(gridZ, BLOCK_ROWS))
}

/** Half-extents of the whole grid footprint (for camera framing / rain volume). */
export const CITY_HALF_WIDTH =
  CORRIDOR_HALF + STREET + blockOffset(SIDE_HALF - 1, BLOCK_COLS) + LOT / 2
export const CITY_HALF_DEPTH = (NEAR + blockOffset(GRID_ROWS - 1, BLOCK_ROWS) + LOT) / 2

/**
 * Deterministic local stand-in for the 200-plot grid, used when Supabase is
 * unconfigured or unreachable so the world still renders. Ids mirror the seed
 * migration's gx-major / gz-minor ordering.
 */
export function fallbackPlots(): Plot[] {
  const out: Plot[] = []
  let id = 1
  for (let gx = 0; gx < CITY_CONFIG.GRID_COLS; gx++) {
    for (let gz = 0; gz < CITY_CONFIG.GRID_ROWS; gz++) {
      out.push({
        id: id++,
        owner_id: null,
        district: districtForColumn(gx).id,
        grid_x: gx,
        grid_z: gz,
        name: 'Unclaimed Plot',
        claimed_at: null,
      })
    }
  }
  return out
}
