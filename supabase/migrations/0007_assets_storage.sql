-- 0007_assets_storage.sql
-- Storage bucket + RLS for voxel asset thumbnails (Phase 2 — voxel builder).
--
-- The bucket is PUBLIC-READ: thumbnails are low-sensitivity preview images. The
-- actual voxel_data's visibility is still governed by assets.is_public + the
-- assets RLS (migration 0002). Uploads are restricted to the owner's own folder:
-- every object must live under `${auth.uid()}/...`, matched via
-- storage.foldername(name)[1]. lib/assets.ts uploads to `${ownerId}/${assetId}.png`,
-- so the path prefix lines up with this policy.
--
-- MANUAL APPLY: run this in the Supabase SQL editor (per the manual-migration
-- workflow). Without it, the first thumbnail upload fails with bucket-not-found.

insert into storage.buckets (id, name, public)
values ('asset-thumbnails', 'asset-thumbnails', true)
on conflict (id) do nothing;

create policy "thumbnails are publicly readable"
  on storage.objects for select
  using (bucket_id = 'asset-thumbnails');

create policy "owners upload their own thumbnails"
  on storage.objects for insert
  with check (
    bucket_id = 'asset-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "owners replace their own thumbnails"
  on storage.objects for update
  using (
    bucket_id = 'asset-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'asset-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
