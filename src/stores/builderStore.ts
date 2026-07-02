import { create } from 'zustand'
import type { BlockType, VoxelBlock } from '@/types/voxel'
import type { Asset } from '@/types/db'
import { saveAsset as saveAssetToDb } from '@/lib/assets'
import { savePlotBlocks } from '@/lib/city'

const MAX_HISTORY = 50

export type BuilderMode = 'build' | 'template'

interface BuilderStore {
  // ── Mode ──
  mode: BuilderMode
  setMode: (mode: BuilderMode) => void
  stashedBlocks: VoxelBlock[] | null

  // ── Armed asset for placement ──
  armedAsset: Asset | null
  placementRotY: number
  armAsset: (asset: Asset) => void
  cancelArmedAsset: () => void
  rotatePlacement: (delta: number) => void

  // ── Voxel model (working buffer — plot blocks in build mode, scratch in template) ──
  blocks: VoxelBlock[]
  selectedBlockType: BlockType
  setSelectedBlockType: (type: BlockType) => void
  placeBlock: (block: VoxelBlock) => void
  removeBlock: (x: number, y: number, z: number) => void
  clearAll: () => void
  loadBlocks: (blocks: VoxelBlock[]) => void

  // ── Stamp asset into current blocks ──
  stampAsset: (asset: Asset, anchorX: number, anchorY: number, anchorZ: number, rotY: number, boundsW: number, boundsD: number, boundsH: number) => void

  // ── Undo / redo ──
  history: VoxelBlock[][]
  future: VoxelBlock[][]
  undo: () => void
  redo: () => void

  // ── Edit-existing tracking (template mode) ──
  editingAsset: Asset | null
  setEditingAsset: (asset: Asset | null) => void

  // ── Fill tool ──
  fillMode: boolean
  fillAnchor: { x: number; y: number; z: number } | null
  toggleFillMode: () => void
  setFillAnchor: (anchor: { x: number; y: number; z: number } | null) => void
  fillVolume: (from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }, type: BlockType) => void

  // ── Library panel trigger (set by Tab key, consumed by pause menu) ──
  showLibrary: boolean

  // ── Runtime / pointer-lock state ──
  locked: boolean
  setLocked: (locked: boolean) => void
  engaged: boolean
  requestLock: (() => void) | null
  registerLock: (fn: (() => void) | null) => void
  capture: (() => string) | null
  registerCapture: (fn: (() => string) | null) => void
  resetRuntime: () => void

  // ── Plot persistence ──
  plotId: number | null
  setPlotId: (id: number | null) => void
  savePlot: () => Promise<void>

  // ── Asset template save ──
  saveAsset: (name: string) => Promise<void>
}

const sameCell = (b: VoxelBlock, x: number, y: number, z: number) =>
  b.x === x && b.y === y && b.z === z

function pushHistory(s: { blocks: VoxelBlock[]; history: VoxelBlock[][] }) {
  const h = s.history.length >= MAX_HISTORY ? s.history.slice(1) : s.history
  return { history: [...h, s.blocks], future: [] as VoxelBlock[][] }
}

function rotateBlock(bx: number, bz: number, cw: number, ch: number, rotY: number): [number, number] {
  const steps = (((Math.round(rotY / (Math.PI / 2)) % 4) + 4) % 4)
  let rx = bx
  let rz = bz
  for (let i = 0; i < steps; i++) {
    const tmp = rx
    rx = ch - 1 - rz
    rz = tmp
    const t = ch
    ch = cw
    cw = t
  }
  return [rx, rz]
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  mode: 'build',
  setMode: (mode) => {
    const s = get()
    if (mode === 'template' && s.mode === 'build') {
      set({ mode, stashedBlocks: s.blocks, blocks: [], history: [], future: [], fillMode: false, fillAnchor: null, armedAsset: null })
    } else if (mode === 'build' && s.mode === 'template') {
      set({ mode, blocks: s.stashedBlocks ?? [], stashedBlocks: null, history: [], future: [], fillMode: false, fillAnchor: null, editingAsset: null })
    }
  },
  stashedBlocks: null,

  armedAsset: null,
  placementRotY: 0,
  armAsset: (asset) => set({ armedAsset: asset, placementRotY: 0, fillMode: false, fillAnchor: null }),
  cancelArmedAsset: () => set({ armedAsset: null, placementRotY: 0 }),
  rotatePlacement: (delta) => set((s) => ({ placementRotY: s.placementRotY + delta })),

  blocks: [],
  selectedBlockType: 'concrete',
  setSelectedBlockType: (selectedBlockType) => set({ selectedBlockType }),
  placeBlock: (block) =>
    set((s) => ({
      ...pushHistory(s),
      blocks: [...s.blocks.filter((b) => !sameCell(b, block.x, block.y, block.z)), block],
    })),
  removeBlock: (x, y, z) =>
    set((s) => ({
      ...pushHistory(s),
      blocks: s.blocks.filter((b) => !sameCell(b, x, y, z)),
    })),
  clearAll: () => set({ blocks: [], history: [], future: [], editingAsset: null, fillMode: false, fillAnchor: null }),
  loadBlocks: (blocks) => set({ blocks, history: [], future: [], fillMode: false, fillAnchor: null, armedAsset: null, placementRotY: 0, editingAsset: null }),

  stampAsset: (asset, anchorX, anchorY, anchorZ, rotY, boundsW, boundsD, boundsH) =>
    set((s) => {
      const src = asset.voxel_data
      if (src.length === 0) return s
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
      for (const b of src) {
        if (b.x < minX) minX = b.x
        if (b.x > maxX) maxX = b.x
        if (b.z < minZ) minZ = b.z
        if (b.z > maxZ) maxZ = b.z
      }
      const assetW = maxX - minX + 1
      const assetD = maxZ - minZ + 1
      const halfW = Math.floor(assetW / 2)
      const halfD = Math.floor(assetD / 2)

      const stamped: VoxelBlock[] = []
      for (const b of src) {
        const localX = b.x - minX
        const localZ = b.z - minZ
        const [rx, rz] = rotateBlock(localX, localZ, assetW, assetD, rotY)
        const wx = anchorX + rx - halfW
        const wy = anchorY + b.y
        const wz = anchorZ + rz - halfD
        if (wx < 0 || wx >= boundsW || wy < 0 || wy >= boundsH || wz < 0 || wz >= boundsD) continue
        stamped.push({ x: wx, y: wy, z: wz, type: b.type, color: b.color })
      }
      if (stamped.length === 0) return s
      const stampedSet = new Set(stamped.map((b) => `${b.x},${b.y},${b.z}`))
      const kept = s.blocks.filter((b) => !stampedSet.has(`${b.x},${b.y},${b.z}`))
      return { ...pushHistory(s), blocks: [...kept, ...stamped], armedAsset: null, placementRotY: 0 }
    }),

  history: [],
  future: [],
  undo: () =>
    set((s) => {
      if (s.history.length === 0) return s
      const prev = s.history[s.history.length - 1]
      return { blocks: prev, history: s.history.slice(0, -1), future: [...s.future, s.blocks] }
    }),
  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s
      const next = s.future[s.future.length - 1]
      return { blocks: next, future: s.future.slice(0, -1), history: [...s.history, s.blocks] }
    }),

  editingAsset: null,
  setEditingAsset: (editingAsset) => set({ editingAsset }),

  fillMode: false,
  fillAnchor: null,
  toggleFillMode: () => set((s) => ({ fillMode: !s.fillMode, fillAnchor: null })),
  setFillAnchor: (fillAnchor) => set({ fillAnchor }),
  fillVolume: (from, to, type) =>
    set((s) => {
      const minX = Math.min(from.x, to.x)
      const maxX = Math.max(from.x, to.x)
      const minY = Math.min(from.y, to.y)
      const maxY = Math.max(from.y, to.y)
      const minZ = Math.min(from.z, to.z)
      const maxZ = Math.max(from.z, to.z)
      const count = (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1)
      if (count > 1000) return s
      const filled: VoxelBlock[] = []
      for (let x = minX; x <= maxX; x++)
        for (let y = minY; y <= maxY; y++)
          for (let z = minZ; z <= maxZ; z++)
            filled.push({ x, y, z, type })
      const filledSet = new Set(filled.map((b) => `${b.x},${b.y},${b.z}`))
      const kept = s.blocks.filter((b) => !filledSet.has(`${b.x},${b.y},${b.z}`))
      return { ...pushHistory(s), blocks: [...kept, ...filled], fillAnchor: null }
    }),

  showLibrary: false,

  locked: false,
  setLocked: (locked) => set((s) => ({ locked, engaged: s.engaged || locked })),
  engaged: false,
  requestLock: null,
  registerLock: (requestLock) => set({ requestLock }),
  capture: null,
  registerCapture: (capture) => set({ capture }),
  resetRuntime: () => set({ locked: false, engaged: false, requestLock: null, capture: null }),

  plotId: null,
  setPlotId: (plotId) => set({ plotId }),
  savePlot: async () => {
    const { plotId, blocks } = get()
    if (plotId == null) return
    await savePlotBlocks(plotId, blocks)
  },

  saveAsset: async (name) => {
    const { blocks, capture, mode, stashedBlocks } = get()
    const thumbnail = capture?.() ?? ''
    await saveAssetToDb(name, blocks, thumbnail)
    if (mode === 'template') {
      set({ mode: 'build', blocks: stashedBlocks ?? [], stashedBlocks: null, history: [], future: [], editingAsset: null, fillMode: false, fillAnchor: null })
    } else {
      set({ blocks: [], history: [], future: [], editingAsset: null, fillMode: false, fillAnchor: null })
    }
  },
}))
