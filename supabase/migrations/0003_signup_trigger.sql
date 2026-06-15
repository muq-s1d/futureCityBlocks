-- 0003_signup_trigger.sql
-- Auth flow (docs/spec.md):
--   1. signup -> auth.users row
--   2. trigger auto-creates a public.profiles row
--   3. profile-create trigger claims the oldest unclaimed plot
-- Both functions are SECURITY DEFINER with an empty search_path and fully
-- qualified names, so they run with owner privileges and bypass RLS safely.

-- (2) Create a profile when a new auth user is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  final_username text;
begin
  -- Prefer a username supplied at signup (options.data.username), else the
  -- email local-part. Guarantee uniqueness with a short id suffix on collision.
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(new.email, '@', 1)
  );
  final_username := base_username;

  if exists (select 1 from public.profiles where username = final_username) then
    final_username := base_username || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;

  insert into public.profiles (id, username)
  values (new.id, final_username);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- (3) Claim the oldest unclaimed plot for the new profile.
create or replace function public.assign_plot_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_plot_id int;
begin
  -- Lowest-id unclaimed plot = "oldest". SKIP LOCKED avoids two concurrent
  -- signups racing for the same plot.
  select id into target_plot_id
  from public.plots
  where owner_id is null
  order by id
  limit 1
  for update skip locked;

  if target_plot_id is not null then
    update public.plots
    set owner_id = new.id, claimed_at = now()
    where id = target_plot_id;
  end if;

  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.assign_plot_to_profile();

-- These run only via their triggers; no role should call them directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.assign_plot_to_profile() from public, anon, authenticated;
