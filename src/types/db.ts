/**
 * Row shapes for the Supabase/Postgres tables defined in docs/spec.md.
 * These mirror the SQL schema in supabase/migrations.
 */
import type { VoxelBlock } from './voxel'

export interface Profile {
  id: string
  username: string
  created_at: string
}

export interface Plot {
  id: number
  owner_id: string | null
  grid_x: number
  grid_z: number
  name: string
  claimed_at: string | null
}

export interface CityConfigValues {
  GRID_COLS: number
  GRID_ROWS: number
  TOTAL_PLOTS: number
  PLOT_SIZE: number
  LOT: number
  ALLEY: number
  STREET: number
  CORRIDOR_HALF: number
  NEAR: number
  BLOCK_COLS: number
  BLOCK_ROWS: number
}

export interface DistrictConfig {
  id: string
  label: string
  color: string
  gridRange: { xMin: number; xMax: number }
}

export interface WorldConfig {
  id: number
  version: number
  is_active: boolean
  config: CityConfigValues
  districts: DistrictConfig[]
  created_at: string
}

export interface Asset {
  id: string
  owner_id: string
  name: string
  voxel_data: VoxelBlock[]
  thumbnail: string | null
  is_public: boolean
  created_at: string
}

export interface PlotObject {
  id: string
  plot_id: number
  asset_id: string
  pos_x: number
  pos_y: number
  pos_z: number
  rot_y: number
  placed_at: string
}
