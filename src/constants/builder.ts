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

/** World units per voxel cell. */
export const CELL = 1

/**
 * Build volume in cells — a generous 40×40 footprint and 100 cells tall, so
 * players can raise full skyscrapers, not just lot-sized structures. This is the
 * builder's editing space; it's larger than a city LOT (8u), so big builds will
 * overhang neighbouring lots when placed back on the plot (intended — skyscrapers
 * are meant to be big). The hard cap on rendered instances (VoxelBlocksMesh) is
 * decoupled from this volume so an empty builder doesn't preallocate 160k cubes.
 */
export const BUILDER_BOUNDS = { w: 40, d: 40, h: 100 } as const

/** Raycast hit-distance cap (cells) — how far the player can reach to edit. */
export const MAX_REACH = 12

/** Fly speed (world units / second) for WASD + vertical movement. Scaled up for
 *  the larger volume so crossing the 100-tall space doesn't crawl. */
export const FLY_SPEED = 16

/**
 * Camera arrival/home pose for a plot at world (cx, cz): pulled back and up to
 * frame the big build box. Shared by CityField's fly-in leg and BuilderScene's
 * FPS home so the hand-off (and the return on exit) is seamless.
 */
export function builderArrivalPose(
  cx: number,
  cz: number,
): { pos: [number, number, number]; tgt: [number, number, number] } {
  return {
    pos: [cx, BUILDER_BOUNDS.h * 0.25, cz + BUILDER_BOUNDS.w * 1.1],
    tgt: [cx, BUILDER_BOUNDS.h * 0.2, cz],
  }
}

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
