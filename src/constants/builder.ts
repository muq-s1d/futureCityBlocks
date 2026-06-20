/**
 * Voxel builder configuration (Phase 2).
 *
 * The builder is a first-person, Minecraft-style flying editor entered from the
 * owned plot. These constants define its bounded build volume, fly/look feel,
 * hotbar order, and per-block colours.
 *
 * Literal hex values live here (not as palette-token CSS vars) for the same
 * reason as constants/palette.ts and constants/city.ts: three.js materials need
 * real colours at the WebGL layer. neon/light map onto the locked PALETTE; the
 * structural greys (concrete/glass/metal/signage) are intentionally desaturated
 * in-family hues, not arbitrary off-palette colours.
 */
import { PALETTE } from '@/constants/palette'
import type { BlockType } from '@/types/voxel'

/** World units per voxel cell. LOT (8, CITY_CONFIG) is the plot footprint, so a
 *  1-unit cell yields an exact 8×8 floor with no fudge factor. */
export const CELL = 1

/** Build volume in cells. w×d matches the LOT footprint; h gives generous height. */
export const BUILDER_BOUNDS = { w: 8, d: 8, h: 16 } as const

/** Raycast hit-distance cap (cells) — how far the player can reach to edit. */
export const MAX_REACH = 10

/** Fly speed (world units / second) for WASD + vertical movement. */
export const FLY_SPEED = 6

/** Mouse-look sensitivity (radians per pixel of pointer movement). */
export const MOUSE_SENSITIVITY = 0.0022

/**
 * Hotbar order, slots 1..7. BlockType is locked in types/voxel.ts — this only
 * enumerates the existing union, it does not add new types.
 */
export const BLOCK_TYPES: readonly BlockType[] = [
  'concrete',
  'glass',
  'neon_cyan',
  'neon_magenta',
  'metal',
  'signage',
  'light',
]

/** Render colour per block type. */
export const BLOCK_COLOR: Record<BlockType, string> = {
  concrete: '#4a4a5e',
  glass: '#7fb3c9',
  neon_cyan: PALETTE.cyan,
  neon_magenta: PALETTE.magenta,
  metal: '#8a8a9c',
  signage: PALETTE.amber,
  light: '#ffffff',
}

/** Block types that should render as unlit/emissive neon (toneMapped off). */
export const EMISSIVE_BLOCKS: ReadonlySet<BlockType> = new Set<BlockType>([
  'neon_cyan',
  'neon_magenta',
  'signage',
  'light',
])

/** Human-readable hotbar labels. */
export const BLOCK_LABEL: Record<BlockType, string> = {
  concrete: 'Concrete',
  glass: 'Glass',
  neon_cyan: 'Neon Cyan',
  neon_magenta: 'Neon Magenta',
  metal: 'Metal',
  signage: 'Signage',
  light: 'Light',
}
