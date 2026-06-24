import type { BlockType, VoxelBlock } from '@/types/voxel'

type SpatialIndex = Set<string>

function cellKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

function buildSpatialIndex(blocks: VoxelBlock[]): SpatialIndex {
  const idx = new Set<string>()
  for (const b of blocks) idx.add(cellKey(b.x, b.y, b.z))
  return idx
}

export interface GreedyMeshResult {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  /** quadIndex → source VoxelBlock (the cell at the quad's origin corner). */
  quadCells: VoxelBlock[]
  vertexColors: Float32Array | null
}

// Axis definitions for the 6 face directions.
// [normalAxis, uAxis, vAxis, sign] where sign=1 for positive normal, -1 for negative.
interface FaceAxis {
  normalAxis: 0 | 1 | 2 // x=0, y=1, z=2
  uAxis: 0 | 1 | 2
  vAxis: 0 | 1 | 2
  sign: 1 | -1
  flip: boolean // true when vAxis×uAxis opposes the desired normal
}

const FACE_AXES: FaceAxis[] = [
  { normalAxis: 0, uAxis: 2, vAxis: 1, sign: 1, flip: false },  // +X: y×z = +x ✓
  { normalAxis: 0, uAxis: 2, vAxis: 1, sign: -1, flip: false }, // -X
  { normalAxis: 1, uAxis: 0, vAxis: 2, sign: 1, flip: false },  // +Y: z×x = +y ✓
  { normalAxis: 1, uAxis: 0, vAxis: 2, sign: -1, flip: false }, // -Y
  { normalAxis: 2, uAxis: 0, vAxis: 1, sign: 1, flip: true },   // +Z: y×x = -z, flip
  { normalAxis: 2, uAxis: 0, vAxis: 1, sign: -1, flip: true },  // -Z
]

interface CellInfo {
  block: VoxelBlock
  colorKey: string
}

export function greedyMesh(
  blocks: VoxelBlock[],
  allBlocks: SpatialIndex,
  defaultColor: string,
): GreedyMeshResult {
  if (blocks.length === 0) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      indices: new Uint32Array(0),
      quadCells: [],
      vertexColors: null,
    }
  }

  // Build a lookup from cell key to block for this type
  const typeMap = new Map<string, VoxelBlock>()
  let minPos = [Infinity, Infinity, Infinity]
  let maxPos = [-Infinity, -Infinity, -Infinity]
  for (const b of blocks) {
    typeMap.set(cellKey(b.x, b.y, b.z), b)
    const coords = [b.x, b.y, b.z]
    for (let i = 0; i < 3; i++) {
      if (coords[i]! < minPos[i]!) minPos[i] = coords[i]!
      if (coords[i]! > maxPos[i]!) maxPos[i] = coords[i]!
    }
  }

  const posArr: number[] = []
  const normArr: number[] = []
  const idxArr: number[] = []
  const colorArr: number[] = []
  const quadCells: VoxelBlock[] = []
  let hasCustomColors = false
  let vertIdx = 0

  const defaultR = parseInt(defaultColor.slice(1, 3), 16) / 255
  const defaultG = parseInt(defaultColor.slice(3, 5), 16) / 255
  const defaultB = parseInt(defaultColor.slice(5, 7), 16) / 255

  for (const axis of FACE_AXES) {
    const { normalAxis, uAxis, vAxis, sign, flip } = axis
    const nMin = minPos[normalAxis]!
    const nMax = maxPos[normalAxis]!
    const uMin = minPos[uAxis]!
    const uMax = maxPos[uAxis]!
    const vMin = minPos[vAxis]!
    const vMax = maxPos[vAxis]!
    const uSize = uMax - uMin + 1
    const vSize = vMax - vMin + 1

    // For each slice along the normal axis
    for (let n = nMin; n <= nMax; n++) {
      // Build a 2D mask of exposed faces for this slice
      const mask: (CellInfo | null)[] = new Array(uSize * vSize).fill(null)

      for (let u = uMin; u <= uMax; u++) {
        for (let v = vMin; v <= vMax; v++) {
          const pos = [0, 0, 0]
          pos[normalAxis] = n
          pos[uAxis] = u
          pos[vAxis] = v
          const block = typeMap.get(cellKey(pos[0]!, pos[1]!, pos[2]!))
          if (!block) continue

          // Check neighbor in the normal direction
          const neighbor = [pos[0]!, pos[1]!, pos[2]!]
          neighbor[normalAxis]! += sign
          if (allBlocks.has(cellKey(neighbor[0]!, neighbor[1]!, neighbor[2]!))) continue

          const colorKey = block.color ?? ''
          mask[(u - uMin) * vSize + (v - vMin)] = { block, colorKey }
        }
      }

      // Greedy merge rectangles from the mask
      for (let u = 0; u < uSize; u++) {
        for (let v = 0; v < vSize; v++) {
          const cell = mask[u * vSize + v]
          if (!cell) continue

          // Extend width (v direction) as far as possible
          let w = 1
          while (v + w < vSize) {
            const next = mask[u * vSize + v + w]
            if (!next || next.colorKey !== cell.colorKey) break
            w++
          }

          // Extend height (u direction) as far as possible
          let h = 1
          outer: while (u + h < uSize) {
            for (let dv = 0; dv < w; dv++) {
              const next = mask[(u + h) * vSize + v + dv]
              if (!next || next.colorKey !== cell.colorKey) break outer
            }
            h++
          }

          // Clear the merged region
          for (let du = 0; du < h; du++) {
            for (let dv = 0; dv < w; dv++) {
              mask[(u + du) * vSize + v + dv] = null
            }
          }

          // Emit the merged quad
          const worldU0 = u + uMin
          const worldV0 = v + vMin
          const worldU1 = worldU0 + h
          const worldV1 = worldV0 + w

          const quad = mergedFaceQuad(normalAxis, uAxis, vAxis, sign, flip, n, worldU0, worldV0, worldU1, worldV1)
          for (let i = 0; i < 4; i++) {
            posArr.push(quad[i * 3]!, quad[i * 3 + 1]!, quad[i * 3 + 2]!)
          }

          const nx = normalAxis === 0 ? sign : 0
          const ny = normalAxis === 1 ? sign : 0
          const nz = normalAxis === 2 ? sign : 0
          for (let i = 0; i < 4; i++) normArr.push(nx, ny, nz)

          // Color
          const c = cell.block.color
          if (c) {
            hasCustomColors = true
            const r = parseInt(c.slice(1, 3), 16) / 255
            const g = parseInt(c.slice(3, 5), 16) / 255
            const b_ = parseInt(c.slice(5, 7), 16) / 255
            for (let i = 0; i < 4; i++) colorArr.push(r, g, b_)
          } else {
            for (let i = 0; i < 4; i++) colorArr.push(defaultR, defaultG, defaultB)
          }

          idxArr.push(vertIdx, vertIdx + 1, vertIdx + 2)
          idxArr.push(vertIdx, vertIdx + 2, vertIdx + 3)
          quadCells.push(cell.block)
          vertIdx += 4
        }
      }
    }
  }

  return {
    positions: new Float32Array(posArr),
    normals: new Float32Array(normArr),
    indices: new Uint32Array(idxArr),
    quadCells,
    vertexColors: hasCustomColors ? new Float32Array(colorArr) : null,
  }
}

/** Build per-type greedy meshes from a full VoxelBlock[] array. */
export function buildMeshData(
  blocks: VoxelBlock[],
  blockTypes: readonly BlockType[],
  defaultColors: Record<BlockType, string>,
): Map<BlockType, GreedyMeshResult> {
  const spatial = buildSpatialIndex(blocks)

  const buckets = new Map<BlockType, VoxelBlock[]>()
  for (const t of blockTypes) buckets.set(t, [])
  for (const b of blocks) {
    const arr = buckets.get(b.type)
    if (arr) arr.push(b)
  }

  const results = new Map<BlockType, GreedyMeshResult>()
  for (const t of blockTypes) {
    const bucket = buckets.get(t)!
    if (bucket.length === 0) {
      results.set(t, {
        positions: new Float32Array(0),
        normals: new Float32Array(0),
        indices: new Uint32Array(0),
        quadCells: [],
        vertexColors: null,
      })
    } else {
      results.set(t, greedyMesh(bucket, spatial, defaultColors[t]))
    }
  }
  return results
}

/**
 * Emit a merged quad spanning [u0..u1) × [v0..v1) on the face plane.
 * CCW winding from the outside (normal direction).
 */
function mergedFaceQuad(
  normalAxis: number,
  uAxis: number,
  vAxis: number,
  sign: number,
  flip: boolean,
  nSlice: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
): number[] {
  const nCoord = sign === 1 ? nSlice + 1 : nSlice

  // Base winding (before flip): CCW for outward normal when vAxis×uAxis = +normalAxis
  // When flip=true, vAxis×uAxis = -normalAxis, so we swap v0↔v1 to fix winding
  let corners: [number, number][]
  if (sign === 1) {
    corners = flip
      ? [[u0, v1], [u0, v0], [u1, v0], [u1, v1]]
      : [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]
  } else {
    corners = flip
      ? [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]
      : [[u0, v1], [u0, v0], [u1, v0], [u1, v1]]
  }

  const result: number[] = []
  for (const [cu, cv] of corners) {
    const p = [0, 0, 0]
    p[normalAxis] = nCoord
    p[uAxis] = cu
    p[vAxis] = cv
    result.push(p[0]!, p[1]!, p[2]!)
  }
  return result
}
