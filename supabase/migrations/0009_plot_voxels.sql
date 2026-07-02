-- Add voxel_data column to plots for direct block storage.
-- When users build on their plot, blocks are stored here (not as plot_objects).
alter table public.plots
  add column voxel_data jsonb not null default '[]'::jsonb;
