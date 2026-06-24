-- 0008_world_configs.sql
-- Data-driven world configuration: move CITY_CONFIG + DISTRICTS from compiled
-- TypeScript constants into a versioned DB row so the map can retune without a
-- Vercel redeploy. Only one row is active at a time (is_active = true).
--
-- Also drops the denormalized `district` column from `plots` — district is now
-- derived at runtime from the active config's district grid ranges + the plot's
-- grid_x. This avoids a reconciliation migration every time a district boundary
-- moves.

-- ── Create table ────────────────────────────────────────────────────────────
create table public.world_configs (
  id         serial       primary key,
  version    int          not null unique,
  is_active  boolean      not null default false,
  config     jsonb        not null,
  districts  jsonb        not null,
  created_at timestamptz  not null default now()
);

comment on table public.world_configs is
  'Versioned world layout configs. Exactly one row has is_active = true.';

-- ── Seed version 1 (current hardcoded values from constants/city.ts) ────────
insert into public.world_configs (version, is_active, config, districts)
values (
  1,
  true,
  '{
    "GRID_COLS": 20,
    "GRID_ROWS": 10,
    "TOTAL_PLOTS": 200,
    "PLOT_SIZE": 10,
    "LOT": 25,
    "ALLEY": 6,
    "STREET": 42,
    "CORRIDOR_HALF": 15,
    "NEAR": 172,
    "BLOCK_COLS": 2,
    "BLOCK_ROWS": 5
  }'::jsonb,
  '[
    {"id": "neon",        "label": "Neon District",   "color": "#00ffe7", "gridRange": {"xMin": 0,  "xMax": 6}},
    {"id": "corporate",   "label": "Corporate Zone",  "color": "#ffd700", "gridRange": {"xMin": 7,  "xMax": 12}},
    {"id": "underground", "label": "Underground",     "color": "#ff2d78", "gridRange": {"xMin": 13, "xMax": 19}}
  ]'::jsonb
);

-- ── RLS: read-only for everyone, no client writes ───────────────────────────
alter table public.world_configs enable row level security;

create policy "Anyone can read world configs"
  on public.world_configs for select
  using (true);

-- ── Drop district column from plots ─────────────────────────────────────────
-- District is now derived from grid_x + the active config's district ranges.
-- The claim_plot RPC is rewritten below to match.
alter table public.plots drop column if exists district;

-- ── Rewrite claim_plot to derive district from world_configs ────────────────
create or replace function public.claim_plot(p_district text)
returns public.plots
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  existing public.plots;
  target   public.plots;
  cfg      jsonb;
  d        jsonb;
  x_min    int;
  x_max    int;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into existing from public.plots where owner_id = uid order by id limit 1;
  if found then
    return existing;
  end if;

  -- Look up the active config's district range for the requested district.
  select wc.districts into cfg
  from public.world_configs wc
  where wc.is_active = true
  limit 1;

  if cfg is null then
    raise exception 'no active world config' using errcode = 'P0001';
  end if;

  -- Find the district entry matching p_district.
  select elem into d
  from jsonb_array_elements(cfg) as elem
  where elem->>'id' = p_district
  limit 1;

  if d is null then
    raise exception 'unknown district %', p_district using errcode = 'P0002';
  end if;

  x_min := (d->'gridRange'->>'xMin')::int;
  x_max := (d->'gridRange'->>'xMax')::int;

  -- Oldest unclaimed plot whose grid_x falls in the district's range.
  select * into target
  from public.plots
  where owner_id is null
    and grid_x between x_min and x_max
  order by id
  limit 1
  for update skip locked;

  if not found then
    raise exception 'no open plots in district %', p_district using errcode = 'P0002';
  end if;

  update public.plots
  set owner_id = uid, claimed_at = now()
  where id = target.id
  returning * into target;

  return target;
end;
$$;
