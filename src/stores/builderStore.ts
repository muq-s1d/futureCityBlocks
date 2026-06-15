import { create } from 'zustand'
import type { BlockType, VoxelBlock } from '@/types/voxel'

interface BuilderStore {
  blocks: VoxelBlock[]
  selectedBlockType: BlockType
  setSelectedBlockType: (type: BlockType) => void
  placeBlock: (block: VoxelBlock) => void
  removeBlock: (x: number, y: number, z: number) => void
  clearAll: () => void
  /** Phase 2: serialize blocks → Supabase Storage + assets row. */
  saveAsset: (name: string) => Promise<void>
}

const sameCell = (b: VoxelBlock, x: number, y: number, z: number) =>
  b.x === x && b.y === y && b.z === z

export const useBuilderStore = create<BuilderStore>((set) => ({
  blocks: [],
  selectedBlockType: 'concrete',
  setSelectedBlockType: (selectedBlockType) => set({ selectedBlockType }),
  placeBlock: (block) =>
    set((s) => ({
      // One block per cell — replace any existing block at the same position.
      blocks: [
        ...s.blocks.filter((b) => !sameCell(b, block.x, block.y, block.z)),
        block,
      ],
    })),
  removeBlock: (x, y, z) =>
    set((s) => ({ blocks: s.blocks.filter((b) => !sameCell(b, x, y, z)) })),
  clearAll: () => set({ blocks: [] }),
  saveAsset: async () => {
    throw new Error('saveAsset is implemented in Phase 2 (voxel builder).')
  },
}))
