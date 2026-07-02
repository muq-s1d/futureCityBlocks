/**
 * Asset + plot-object data actions (Phase 2). Like lib/city.ts / lib/auth.ts,
 * all Supabase access lives here — never in components or stores. The builder
 * store and the placement UI call these; they don't touch Supabase directly.
 *
 * Assets are reusable voxel templates (the `assets` table). Placing one onto a
 * plot writes a `plot_objects` row referencing it. RLS (migrations 0001/0002)
 * gates inserts on ownership; thumbnail uploads are gated by the Storage policies
 * in migration 0007 on the `${ownerId}/...` path prefix.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Asset, PlotObject } from '@/types/db'
import type { VoxelBlock } from '@/types/voxel'

const THUMB_BUCKET = 'asset-thumbnails'

/** A plot object joined with the asset it places (for rendering on the plot). */
export type PlacedAsset = PlotObject & { asset: Asset }

function requireConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.')
  }
}

function requireUserId(): string {
  const id = useAuthStore.getState().user?.id
  if (!id) throw new Error('You must be signed in to do that.')
  return id
}

/** Strip a `data:image/png;base64,XXXX` URL to a raw byte array. */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Save the scratch buffer as a named, reusable asset: upload the thumbnail PNG
 * to Storage under the owner's folder (RLS requires the `${ownerId}/` prefix),
 * then insert the `assets` row with the public thumbnail URL. The asset id is
 * generated client-side so the upload path and the row id match.
 */
export async function saveAsset(
  name: string,
  blocks: VoxelBlock[],
  thumbnailDataUrl: string,
): Promise<Asset> {
  requireConfigured()
  const ownerId = requireUserId()
  const id = crypto.randomUUID()

  let thumbnailUrl: string | null = null
  if (thumbnailDataUrl) {
    const path = `${ownerId}/${id}.png`
    const { error: upErr } = await supabase.storage
      .from(THUMB_BUCKET)
      .upload(path, dataUrlToBytes(thumbnailDataUrl), { contentType: 'image/png', upsert: true })
    if (upErr) throw upErr
    thumbnailUrl = supabase.storage.from(THUMB_BUCKET).getPublicUrl(path).data.publicUrl
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({ id, owner_id: ownerId, name, voxel_data: blocks, thumbnail: thumbnailUrl })
    .select('*')
    .single()
  if (error) throw error
  return data as Asset
}

/** All assets owned by the signed-in user, newest first. */
export async function loadOwnedAssets(): Promise<Asset[]> {
  requireConfigured()
  const ownerId = requireUserId()
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Asset[]
}

/** Place a saved asset onto a plot the user owns (one plot_objects row). */
export async function placeAssetOnPlot(
  plotId: number,
  assetId: string,
  x: number,
  y: number,
  z: number,
  rotY = 0,
): Promise<PlotObject> {
  requireConfigured()
  const { data, error } = await supabase
    .from('plot_objects')
    .insert({ plot_id: plotId, asset_id: assetId, pos_x: x, pos_y: y, pos_z: z, rot_y: rotY })
    .select('*')
    .single()
  if (error) throw error
  return data as PlotObject
}

/** Load all objects placed on a plot, each joined with its asset for rendering. */
export async function loadPlotObjects(plotId: number): Promise<PlacedAsset[]> {
  requireConfigured()
  const { data, error } = await supabase
    .from('plot_objects')
    .select('*, asset:assets(*)')
    .eq('plot_id', plotId)
    .order('placed_at')
  if (error) throw error
  return (data ?? []) as PlacedAsset[]
}

/** Update an existing asset's name, voxel data, and thumbnail. */
export async function updateAsset(
  id: string,
  name: string,
  blocks: VoxelBlock[],
  thumbnailDataUrl: string,
): Promise<Asset> {
  requireConfigured()
  const ownerId = requireUserId()

  let thumbnailUrl: string | null = null
  if (thumbnailDataUrl) {
    const path = `${ownerId}/${id}.png`
    const { error: upErr } = await supabase.storage
      .from(THUMB_BUCKET)
      .upload(path, dataUrlToBytes(thumbnailDataUrl), { contentType: 'image/png', upsert: true })
    if (upErr) throw upErr
    thumbnailUrl = supabase.storage.from(THUMB_BUCKET).getPublicUrl(path).data.publicUrl
  }

  const { data, error } = await supabase
    .from('assets')
    .update({ name, voxel_data: blocks, thumbnail: thumbnailUrl })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .single()
  if (error) throw error
  return data as Asset
}

/** Delete an asset and all plot_objects referencing it, plus its thumbnail. */
export async function deleteAsset(id: string): Promise<void> {
  requireConfigured()
  const ownerId = requireUserId()

  const { error: poErr } = await supabase.from('plot_objects').delete().eq('asset_id', id)
  if (poErr) throw poErr

  const { error } = await supabase.from('assets').delete().eq('id', id).eq('owner_id', ownerId)
  if (error) throw error

  await supabase.storage.from(THUMB_BUCKET).remove([`${ownerId}/${id}.png`])
}

/** Partially update a placed object (position, rotation). */
export async function updatePlotObject(
  id: string,
  updates: { pos_x?: number; pos_y?: number; pos_z?: number; rot_y?: number },
): Promise<PlotObject> {
  requireConfigured()
  const { data, error } = await supabase
    .from('plot_objects')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as PlotObject
}

/** Remove a placed object from a plot. */
export async function deletePlotObject(id: string): Promise<void> {
  requireConfigured()
  const { error } = await supabase.from('plot_objects').delete().eq('id', id)
  if (error) throw error
}

/**
 * Subscribe to live changes to a plot's objects (Supabase Realtime).
 *
 * NOT wired up yet — there is no UI to observe another user's plot live until
 * Phase 3 (visiting plots). It's written now so Phase 3 only has to call it.
 * Returns an unsubscribe function.
 */
export function subscribeToPlotObjects(plotId: number, onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => {}
  const channel = supabase
    .channel(`plot_objects:${plotId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'plot_objects', filter: `plot_id=eq.${plotId}` },
      () => onChange(),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
