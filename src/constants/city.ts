/**
 * City grid + district configuration (docs/spec.md).
 *
 * District `color` values are literal hexes (not CSS tokens) because three.js
 * fog/material colors require real color values at the WebGL layer. They are
 * intentionally the same locked palette hues as tokens.css:
 *   neon → cyan, corporate → amber, underground → magenta.
 */

export const CITY_CONFIG = {
  GRID_COLS: 20,
  GRID_ROWS: 10,
  TOTAL_PLOTS: 200,
  PLOT_SIZE: 10, // world units per plot

  // ── Lot-and-block layout ──────────────────────────────────────────────────
  // The 20×10 grid is laid out as a real neighborhood: a central highway with
  // blocks of lots flanking BOTH sides. Within a block, lots are separated by a
  // thin ALLEY; blocks are separated by a wider STREET. Columns 0–9 sit left of
  // the highway, 10–19 to the right; rows run away into depth (−z).
  LOT: 8, // plot footprint (world units)
  ALLEY: 2, // gap between lots inside a block
  STREET: 9, // road between blocks (and between highway and first block)
  CORRIDOR_HALF: 15, // half-width of the central highway
  NEAR: 172, // depth of the first row of lots — sits BEHIND the near skyline, in
  // the clearing carved through it (see CityField CLEARING_NEAR_Z/FAR_Z)
  BLOCK_COLS: 2, // lots per block across (perpendicular to the highway)
  BLOCK_ROWS: 5, // lots per block in depth
} as const

export interface District {
  id: string
  label: string
  color: string
  gridRange: { xMin: number; xMax: number }
}

export const DISTRICTS: readonly District[] = [
  { id: 'neon', label: 'Neon District', color: '#00ffe7', gridRange: { xMin: 0, xMax: 6 } },
  { id: 'corporate', label: 'Corporate Zone', color: '#ffd700', gridRange: { xMin: 7, xMax: 12 } },
  { id: 'underground', label: 'Underground', color: '#ff2d78', gridRange: { xMin: 13, xMax: 19 } },
] as const

/** District whose x-range contains the given grid column. */
export function districtForColumn(gridX: number): District {
  const found = DISTRICTS.find(
    (d) => gridX >= d.gridRange.xMin && gridX <= d.gridRange.xMax,
  )
  // Grid columns are bounded to [0, GRID_COLS-1], which the districts fully cover.
  return found ?? DISTRICTS[0]!
}
