-- 0005_delete_user.sql
-- Self-service account deletion. The anon/authenticated client cannot remove
-- rows from auth.users, so this SECURITY DEFINER function does it for the
-- *calling* user only (auth.uid()): it clears their data, releases their plot
-- back to the unclaimed pool, then deletes the profile and the auth user.
-- Empty search_path + fully-qualified names per Supabase security guidance.

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Remove objects placed on the user's plots, then their assets.
  delete from public.plot_objects
    where plot_id in (select id from public.plots where owner_id = uid);
  delete from public.assets where owner_id = uid;

  -- Return any owned plot to the pool so it can be claimed again.
  update public.plots
    set owner_id = null, claimed_at = null, name = 'Unnamed Plot'
    where owner_id = uid;

  -- Drop the profile, then the auth user (this invalidates their session).
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

-- Only a logged-in user may call it (always on their own account).
revoke execute on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
