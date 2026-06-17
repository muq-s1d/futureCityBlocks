import { PALETTE } from '@/constants/palette'

/**
 * Shared layout of the storefront's recessed shopfront (local space; +z is the
 * street/front). Both the structural Storefront and the interactive dashboard
 * read this so the display windows and their contents stay aligned.
 */
export const SHOPFRONT = {
  width: 60,
  front: 12, // front plane of the building / frame
  backZ: 7, // recessed interior back wall
  contentZ: 8.9, // where window displays sit (deep in the recess)
  glassZ: 11.3, // glazing plane
  sill: 2,
  head: 19.5,
  fascia: 26, // top of the fascia band
  /** Window centres + widths across the frontage. */
  windows: {
    account: { x: -19, w: 14, accent: PALETTE.magenta },
    myplots: { x: 3, w: 26, accent: PALETTE.cyan },
    soon: { x: 23, w: 10, accent: PALETTE.amber },
  },
} as const
