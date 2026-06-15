-- 0001_init_schema.sql
-- Core tables for FutureCity (schema locked by docs/spec.md).
-- Apply manually via the Supabase SQL editor (see docs/CLAUDE.md decisions log).

-- Users (extends Supabase auth.users)
create table public.profiles (
  id          uuid references auth.users primary key,
  username    text unique not null,
  created_at  timestamptz default now()
);

-- Plots
create table public.plots (
  id          serial primary key,
  owner_id    uuid references public.profiles(id),
  district    text not null,
  grid_x      int not null,
  grid_z      int not null,
  name        text default 'Unnamed Plot',
  claimed_at  timestamptz,
  unique (grid_x, grid_z)
);

-- Voxel Assets (user-created structures)
create table public.assets (
  id          uuid default gen_random_uuid() primary key,
  owner_id    uuid references public.profiles(id) not null,
  name        text not null,
  voxel_data  jsonb not null,        -- array of {x,y,z,type,color}
  thumbnail   text,                  -- Supabase Storage URL
  is_public   boolean default false,
  created_at  timestamptz default now()
);

-- Plot Objects (assets placed on plots)
create table public.plot_objects (
  id          uuid default gen_random_uuid() primary key,
  plot_id     int references public.plots(id) not null,
  asset_id    uuid references public.assets(id) not null,
  pos_x       float not null,
  pos_y       float not null,
  pos_z       float not null,
  rot_y       float default 0,
  placed_at   timestamptz default now()
);

-- Indexes on foreign keys (Postgres does not create these automatically) and
-- on the columns used by RLS policies / the plot-claim lookup.
create index plots_owner_id_idx        on public.plots (owner_id);
create index assets_owner_id_idx       on public.assets (owner_id);
create index plot_objects_plot_id_idx  on public.plot_objects (plot_id);
create index plot_objects_asset_id_idx on public.plot_objects (asset_id);

-- Partial index to make "oldest unclaimed plot" lookups an index scan.
create index plots_unclaimed_idx on public.plots (id) where owner_id is null;
