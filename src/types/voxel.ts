export type BlockType =
  | 'concrete'
  | 'glass'
  | 'neon_cyan'
  | 'neon_magenta'
  | 'metal'
  | 'signage'
  | 'light'

export interface VoxelBlock {
  x: number // grid position within asset bounds
  y: number
  z: number
  type: BlockType
  color?: string // override for neon/signage blocks
}

export interface VoxelAsset {
  id: string
  name: string
  blocks: VoxelBlock[]
  bounds: { w: number; h: number; d: number }
}
