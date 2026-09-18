-- Launch preparation, 18 September 2026:
--   1. rate limiting for the public forms (application, access request,
--      contact, booking), kept in Postgres so no extra service is needed;
--   2. two analytics event types for the booking KPI, and one for access
--      requests;
--   3. a "nudged" booking event, written by the daily reminder job.

-- 1. Rate limiting -----------------------------------------------------------

-- One row per accepted attempt. `key` is a salted hash of the client's IP or
-- the lower-cased email, never the raw value. Rows older than the longest
-- window are deleted opportunistically by the function.
create table public.rate_events (
  id     bigserial primary key,
  scope  text not null,
  key    text not null,
  at     timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (scope, key, at desc);

alter table public.rate_events enable row level security;
-- No policies on purpose: only the service role (which bypasses RLS) may
-- touch this table, through the function below.
revoke all on public.rate_events from anon, authenticated;
grant select, insert, delete on public.rate_events to service_role;
grant usage, select on sequence public.rate_events_id_seq to service_role;

-- True when the attempt is allowed (and recorded); false when the key has
-- already used `p_max` attempts within the last `p_window_seconds`.
create or replace function public.rate_limit_hit(p_scope text, p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz := now() - make_interval(secs => p_window_seconds);
  used int;
begin
  delete from public.rate_events where scope = p_scope and key = p_key and at < now() - interval '2 days';
  select count(*) into used from public.rate_events where scope = p_scope and key = p_key and at >= since;
  if used >= p_max then
    return false;
  end if;
  insert into public.rate_events (scope, key) values (p_scope, p_key);
  return true;
end;
$$;
revoke all on function public.rate_limit_hit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, text, int, int) to service_role;

-- 2. Event types --------------------------------------------------------------

alter table public.events drop constraint events_type_check;
alter table public.events add constraint events_type_check
  check (type in ('page_view', 'domain_view', 'house_window', 'house_inside', 'application', 'contact', 'access_request', 'booking_created', 'booking_first_reply'));

-- 3. Nudged booking events ---------------------------------------------------

alter table public.booking_events drop constraint booking_events_type_check;
alter table public.booking_events add constraint booking_events_type_check
  check (type in ('requested', 'accepted', 'proposed', 'declined', 'cancelled', 'note', 'nudged'));

-- Grants unchanged for events and booking_events (see 20260917080000_grants.sql
-- and 20260917180000_bookings.sql); restated for the tables this migration touches.
grant select on public.events to anon, authenticated;
grant insert on public.events to anon, authenticated;
grant select, insert on public.booking_events to anon, authenticated;
