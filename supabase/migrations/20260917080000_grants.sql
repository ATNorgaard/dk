-- Explicit table privileges. The main project got these through default
-- privileges when tables were created from the dashboard role, but a
-- Supabase preview branch runs the migrations without them and the API
-- roles end up with "permission denied". From here on every migration
-- grants what it needs; row-level security still decides which rows.

grant usage on schema public to anon, authenticated, service_role;

-- The house: public reads. Seats only through the staffing view.
grant select on public.domains, public.domain_relationships to anon, authenticated;
grant select on public.domain_staffing, public.daily_domain_metrics to anon, authenticated;

-- Intake: the public may write, never read (policies restrict the columns).
grant insert on public.applications, public.contact_messages, public.events to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Signed-in users: RLS decides rows; these grants make the policies reachable.
grant select, update on public.people to authenticated;
grant select on public.memberships, public.organisations to authenticated;
grant insert, update, delete on public.people, public.memberships, public.organisations to authenticated;
grant select on public.seats, public.applications, public.contact_messages to authenticated;

-- Admin tooling and future edge functions use the service role, which
-- bypasses RLS but still needs the privileges.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
