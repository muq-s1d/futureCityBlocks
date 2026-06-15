-- 0004_seed_plots.sql
-- Seed the 200-plot grid (20 cols x 10 rows) used by the city world.
-- District by column (docs/spec.md constants/city.ts):
--   cols 0-6  -> neon, 7-12 -> corporate, 13-19 -> underground.
-- Idempotent: safe to re-run thanks to the unique(grid_x, grid_z) constraint.

insert into public.plots (district, grid_x, grid_z)
select
  case
    when gx between 0 and 6  then 'neon'
    when gx between 7 and 12 then 'corporate'
    else 'underground'
  end as district,
  gx as grid_x,
  gz as grid_z
from generate_series(0, 19) as gx
cross join generate_series(0, 9) as gz
order by gx, gz
on conflict (grid_x, grid_z) do nothing;
