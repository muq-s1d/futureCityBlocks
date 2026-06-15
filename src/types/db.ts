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
  district: string
  grid_x: number
  grid_z: number
  name: string
  claimed_at: string | null
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
