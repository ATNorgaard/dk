-- Supabase advisor findings, 18 September 2026 (splinter run through
-- `supabase db query --linked`). What this fixes, and what it leaves:
--
--   fixed   the eight role predicates were callable over the REST API from
--           the exposed schema; they move to `private`, which PostgREST does
--           not expose, and stay executable so policies keep evaluating them
--   fixed   trigger and event functions no longer executable by anon or
--           authenticated (triggers do not need EXECUTE at fire time)
--   fixed   two trigger functions without a fixed search_path
--   fixed   the events insert policy was literally `with check (true)`
--   fixed   the public portraits bucket had a broad SELECT policy that let
--           anyone list every file; public buckets serve objects without it
--   fixed   thirteen foreign keys without a covering index
--   kept    security-definer views domain_staffing, daily_domain_metrics and
--           specialist_teasers: that is how the public reads counts and the
--           published-plus-active subset without reading the private rows
--   kept    rate_events with RLS and no policies: service role only, by design
--   kept    multiple permissive policies per table: correct, and cheap at this size
--
-- Policies, views and storage policies reference the helpers by OID, so
-- moving the schema does not touch them. Three helper bodies name other
-- helpers in text and are recreated with the new qualifier; CREATE OR
-- REPLACE keeps their OIDs. New migrations write `private.has_role(...)`.

-- 1. Role predicates out of the exposed schema -------------------------------

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

alter function public.current_person_id() set schema private;
alter function public.current_roles() set schema private;
alter function public.has_role(variadic public.member_role[]) set schema private;
alter function public.has_domain_role(text, variadic public.member_role[]) set schema private;
alter function public.owns_profile(uuid) set schema private;
alter function public.profile_is_live(uuid) set schema private;
alter function public.booking_is_mine(uuid) set schema private;
alter function public.booking_is_in_my_domain(uuid) set schema private;

create or replace function private.booking_is_in_my_domain(target uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1
    from public.booking_requests b
    join public.specialist_profiles p on p.id = b.profile_id
    where b.id = target and private.has_domain_role(p.domain_id, 'domain_lead')
  );
$$;

create or replace function private.booking_is_mine(target uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1
    from public.booking_requests b
    join public.specialist_profiles p on p.id = b.profile_id
    where b.id = target and p.person_id = private.current_person_id()
  );
$$;

create or replace function private.owns_profile(target uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from public.specialist_profiles p
    where p.id = target and p.person_id = private.current_person_id()
  );
$$;

-- Policies run as the querying role, so anon and authenticated keep EXECUTE.
grant execute on function private.current_person_id() to anon, authenticated, service_role;
grant execute on function private.current_roles() to anon, authenticated, service_role;
grant execute on function private.has_role(variadic public.member_role[]) to anon, authenticated, service_role;
grant execute on function private.has_domain_role(text, variadic public.member_role[]) to anon, authenticated, service_role;
grant execute on function private.owns_profile(uuid) to anon, authenticated, service_role;
grant execute on function private.profile_is_live(uuid) to anon, authenticated, service_role;
grant execute on function private.booking_is_mine(uuid) to anon, authenticated, service_role;
grant execute on function private.booking_is_in_my_domain(uuid) to anon, authenticated, service_role;

-- 2. Trigger and event functions: not callable over the API ------------------

revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.audit_row() to postgres, service_role;
grant execute on function public.handle_new_auth_user() to postgres, service_role, supabase_auth_admin;
grant execute on function public.rls_auto_enable() to postgres;

-- 3. Fixed search_path on the two remaining trigger functions ----------------

alter function public.set_updated_at() set search_path = public;
alter function public.people_normalise_email() set search_path = public;

-- 4. Events: a shape check instead of `true` -----------------------------------

drop policy "anyone may record an event" on public.events;
create policy "anyone may record an event" on public.events
  for insert to anon, authenticated
  with check (path like '/%' and char_length(path) <= 300 and (lang is null or lang in ('da', 'en')));

-- 5. Portraits: no listing; owners read their own folder ------------------------

drop policy "portraits are public" on storage.objects;
create policy "owner reads own portrait" on storage.objects
  for select to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = private.current_person_id()::text);

-- 6. Indexes on foreign keys ----------------------------------------------------

create index if not exists access_requests_decided_by_idx on public.access_requests (decided_by);
create index if not exists application_notes_author_idx on public.application_notes (author_person_id);
create index if not exists applications_domain_idx on public.applications (domain_id);
create index if not exists audit_log_actor_person_idx on public.audit_log (actor_person_id);
create index if not exists booking_events_time_idx on public.booking_events (time_id);
create index if not exists booking_events_actor_person_idx on public.booking_events (actor_person_id);
create index if not exists booking_requests_accepted_time_idx on public.booking_requests (accepted_time_id);
create index if not exists contact_messages_domain_idx on public.contact_messages (domain_id);
create index if not exists domain_relationships_domain_b_idx on public.domain_relationships (domain_b);
create index if not exists memberships_granted_by_idx on public.memberships (granted_by);
create index if not exists memberships_organisation_idx on public.memberships (organisation_id);
create index if not exists seats_holder_person_idx on public.seats (holder_person_id);
create index if not exists specialist_profiles_domain_idx on public.specialist_profiles (domain_id);

-- Grants on the tables touched here are unchanged; restated for the record.
grant select, insert on public.events to anon, authenticated;
