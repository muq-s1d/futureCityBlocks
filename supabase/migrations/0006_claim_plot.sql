-- 0006_claim_plot.sql
-- Stage 3 — real claim-a-plot flow. Replaces the signup auto-assign with an
-- explicit, user-driven claim:
--   * drop the on_profile_created trigger + assign_plot_to_profile() so new
--     users own NO plot until they claim one (handle_new_user still creates the
--     profile)
--   * add claim_plot(district) — an atomic SECURITY DEFINER RPC the storefront
--     calls to claim the oldest unclaimed plot in the chosen district.
-- Existing owners are unaffected (the trigger only ever fired on new profiles).

-- ── Drop the auto-assign trigger + function ─────────────────────────────────
drop trigger if exists on_profile_created on public.profiles;
drop function if exists public.assign_plot_to_profile();

-- ── Explicit claim RPC ──────────────────────────────────────────────────────
-- SECURITY DEFINER so it can write owner_id while the plots UPDATE policy stays
-- locked to owners only (clients can't claim/steal arbitrary rows directly).
-- Empty search_path + fully-qualified names = runs safely with owner privileges.
create or replace function public.claim_plot(p_district text)
returns public.plots
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  existing public.plots;
  target public.plots;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- One plot per user: if they already own one, return it (pick is a no-op claim).
  select * into existing from public.plots where owner_id = uid order by id limit 1;
  if found then
    return existing;
  end if;

  -- Oldest (lowest-id) unclaimed plot in the district. SKIP LOCKED so concurrent
  -- claims never block on or race for the same row.
  select * into target
  from public.plots
  where owner_id is null and district = p_district
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

-- Only signed-in users may claim.
revoke execute on function public.claim_plot(text) from public, anon;
grant execute on function public.claim_plot(text) to authenticated;
