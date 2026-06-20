import { create } from 'zustand'
import type { BlockType, VoxelBlock } from '@/types/voxel'
import { saveAsset as saveAssetToDb } from '@/lib/assets'

interface BuilderStore {
  // ── Voxel model (scratch buffer) ──
  blocks: VoxelBlock[]
  selectedBlockType: BlockType
  setSelectedBlockType: (type: BlockType) => void
  placeBlock: (block: VoxelBlock) => void
  removeBlock: (x: number, y: number, z: number) => void
  clearAll: () => void
  /** Replace the whole buffer (Asset Library "load to edit"). */
  loadBlocks: (blocks: VoxelBlock[]) => void

  // ── Runtime / pointer-lock state (shared between BuilderScene and the DOM HUD) ──
  /** True while the pointer is locked and the FPS controls are live. */
  locked: boolean
  setLocked: (locked: boolean) => void
  /** True once the user has locked at least once — distinguishes the first-run
   *  "CLICK TO BUILD" prompt from the in-session pause menu. */
  engaged: boolean
  /** BuilderScene registers a fn that requests pointer lock on the canvas; the
   *  DOM "Click to build" / "Resume" buttons call it (a real user gesture). */
  requestLock: (() => void) | null
  registerLock: (fn: (() => void) | null) => void
  /** BuilderScene registers a fn that snapshots the canvas to a PNG data URL. */
  capture: (() => string) | null
  registerCapture: (fn: (() => string) | null) => void
  /** Reset all runtime state on leaving the builder. */
  resetRuntime: () => void

  /** Serialize the buffer → thumbnail upload + assets row; clears on success. */
  saveAsset: (name: string) => Promise<void>
}

const sameCell = (b: VoxelBlock, x: number, y: number, z: number) =>
  b.x === x && b.y === y && b.z === z

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  blocks: [],
  selectedBlockType: 'concrete',
  setSelectedBlockType: (selectedBlockType) => set({ selectedBlockType }),
  placeBlock: (block) =>
    set((s) => ({
      // One block per cell — replace any existing block at the same position.
      blocks: [...s.blocks.filter((b) => !sameCell(b, block.x, block.y, block.z)), block],
    })),
  removeBlock: (x, y, z) =>
    set((s) => ({ blocks: s.blocks.filter((b) => !sameCell(b, x, y, z)) })),
  clearAll: () => set({ blocks: [] }),
  loadBlocks: (blocks) => set({ blocks }),

  locked: false,
  setLocked: (locked) => set((s) => ({ locked, engaged: s.engaged || locked })),
  engaged: false,
  requestLock: null,
  registerLock: (requestLock) => set({ requestLock }),
  capture: null,
  registerCapture: (capture) => set({ capture }),
  resetRuntime: () => set({ locked: false, engaged: false, requestLock: null, capture: null }),

  saveAsset: async (name) => {
    const { blocks, capture } = get()
    const thumbnail = capture?.() ?? ''
    await saveAssetToDb(name, blocks, thumbnail)
    set({ blocks: [] })
  },
}))
