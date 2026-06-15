-- 0002_rls_policies.sql
-- Row Level Security per docs/spec.md.
--   profiles:     read public, write own row
--   plots:        read public, write own plot
--   assets:       read if public or owner, write own
--   plot_objects: read public, write if plot owner
-- auth.uid() is wrapped in (select ...) so it is evaluated once per query
-- (cached) rather than once per row.

alter table public.profiles     enable row level security;
alter table public.plots        enable row level security;
alter table public.assets       enable row level security;
alter table public.plot_objects enable row level security;

-- ----- profiles -----
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users insert their own profile"
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy "users update their own profile"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ----- plots -----
create policy "plots are publicly readable"
  on public.plots for select
  using (true);

create policy "owners update their own plot"
  on public.plots for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ----- assets -----
create policy "public or owned assets are readable"
  on public.assets for select
  using (is_public or owner_id = (select auth.uid()));

create policy "users insert their own assets"
  on public.assets for insert
  with check (owner_id = (select auth.uid()));

create policy "users update their own assets"
  on public.assets for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "users delete their own assets"
  on public.assets for delete
  using (owner_id = (select auth.uid()));

-- ----- plot_objects -----
create policy "plot objects are publicly readable"
  on public.plot_objects for select
  using (true);

create policy "plot owners insert objects on their plot"
  on public.plot_objects for insert
  with check (
    exists (
      select 1 from public.plots p
      where p.id = plot_id and p.owner_id = (select auth.uid())
    )
  );

create policy "plot owners update objects on their plot"
  on public.plot_objects for update
  using (
    exists (
      select 1 from public.plots p
      where p.id = plot_id and p.owner_id = (select auth.uid())
    )
  );

create policy "plot owners delete objects on their plot"
  on public.plot_objects for delete
  using (
    exists (
      select 1 from public.plots p
      where p.id = plot_id and p.owner_id = (select auth.uid())
    )
  );
