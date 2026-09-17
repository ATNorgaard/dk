-- Booking requests (roadmap 2.5): a visitor asks a specialist for a first
-- meeting with up to three proposed times; the specialist accepts one,
-- proposes another, or declines. The first specialist reply is stamped:
-- that is the collective's response-time KPI.
--   booking_requests  the request: who, what, how long, status, stamps
--   proposed_times    times on the table, by either side
--   booking_events    every reply, in order
-- Visitors act on their own request through a token in the mail; signed-in
-- clients also see their requests by person. Specialists see and answer
-- their own; board and admin read everything; domain leads read their domain.

create type public.booking_status as enum ('requested', 'accepted', 'proposed', 'declined', 'cancelled');

create table public.booking_requests (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  lang                  text not null default 'da' check (lang in ('da', 'en')),
  profile_id            uuid not null references public.specialist_profiles(id) on delete cascade,
  client_person_id      uuid references public.people(id) on delete set null,
  full_name             text not null check (length(full_name) between 2 and 120),
  email                 text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company               text check (company is null or length(company) <= 160),
  brief                 text not null check (length(brief) between 5 and 4000),
  duration_minutes      smallint not null default 20 check (duration_minutes in (20, 45)),
  status                public.booking_status not null default 'requested',
  first_reply_at        timestamptz,
  accepted_time_id      uuid,                                   -- set when a time is agreed
  client_token          text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  consent_at            timestamptz not null
);
comment on table public.booking_requests is 'A first-meeting request to one specialist. first_reply_at feeds the response-time KPI. client_token lets the requester act from the mail without an account.';
create index booking_requests_profile_idx on public.booking_requests (profile_id, created_at desc);
create index booking_requests_client_idx on public.booking_requests (client_person_id) where client_person_id is not null;

create table public.proposed_times (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.booking_requests(id) on delete cascade,
  starts_at   timestamptz not null,
  proposed_by text not null check (proposed_by in ('client', 'specialist')),
  created_at  timestamptz not null default now()
);
create index proposed_times_request_idx on public.proposed_times (request_id, starts_at);

alter table public.booking_requests
  add constraint booking_requests_accepted_time_fk
  foreign key (accepted_time_id) references public.proposed_times(id) on delete set null;

create table public.booking_events (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.booking_requests(id) on delete cascade,
  at               timestamptz not null default now(),
  actor            text not null check (actor in ('client', 'specialist', 'board', 'system')),
  actor_person_id  uuid references public.people(id) on delete set null,
  type             text not null check (type in ('requested', 'accepted', 'proposed', 'declined', 'cancelled', 'note')),
  message          text check (message is null or length(message) <= 2000),
  time_id          uuid references public.proposed_times(id) on delete set null
);
create index booking_events_request_idx on public.booking_events (request_id, at);

create trigger booking_requests_set_updated_at before update on public.booking_requests
  for each row execute function public.set_updated_at();
create trigger booking_requests_audit after insert or update or delete on public.booking_requests
  for each row execute function public.audit_row();

-- The request's specialist: the person who owns the profile.
create or replace function public.booking_is_mine(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.booking_requests b
    join public.specialist_profiles p on p.id = b.profile_id
    where b.id = target and p.person_id = public.current_person_id()
  );
$$;
create or replace function public.booking_is_in_my_domain(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.booking_requests b
    join public.specialist_profiles p on p.id = b.profile_id
    where b.id = target and public.has_domain_role(p.domain_id, 'domain_lead')
  );
$$;
revoke all on function public.booking_is_mine(uuid) from public;
revoke all on function public.booking_is_in_my_domain(uuid) from public;
grant execute on function public.booking_is_mine(uuid) to authenticated;
grant execute on function public.booking_is_in_my_domain(uuid) to authenticated;

alter table public.booking_requests enable row level security;
alter table public.proposed_times enable row level security;
alter table public.booking_events enable row level security;

-- Anyone may ask; decision fields arrive at defaults. Visitors never read
-- through the API: the requester's page reads through the server with the
-- token (service role), and signed-in clients read their own by person.
create policy "anyone may request a meeting" on public.booking_requests
  for insert to anon, authenticated
  with check (status = 'requested' and first_reply_at is null and accepted_time_id is null);
create policy "anyone may propose times on a request" on public.proposed_times
  for insert to anon, authenticated with check (proposed_by = 'client');
create policy "anyone may log the request event" on public.booking_events
  for insert to anon, authenticated with check (actor = 'client' and type = 'requested');

create policy "clients read own requests" on public.booking_requests
  for select to authenticated using (client_person_id = public.current_person_id());
create policy "specialists read own requests" on public.booking_requests
  for select to authenticated using (public.booking_is_mine(id));
create policy "specialists answer own requests" on public.booking_requests
  for update to authenticated using (public.booking_is_mine(id)) with check (public.booking_is_mine(id));
create policy "domain leads read their domain's requests" on public.booking_requests
  for select to authenticated using (public.booking_is_in_my_domain(id));
create policy "board and admin read all requests" on public.booking_requests
  for select to authenticated using (public.has_role('board', 'admin'));

create policy "parties read times" on public.proposed_times
  for select to authenticated
  using (
    public.booking_is_mine(request_id) or public.booking_is_in_my_domain(request_id) or public.has_role('board', 'admin')
    or exists (select 1 from public.booking_requests b where b.id = request_id and b.client_person_id = public.current_person_id())
  );
create policy "specialists propose times" on public.proposed_times
  for insert to authenticated with check (proposed_by = 'specialist' and public.booking_is_mine(request_id));

create policy "parties read events" on public.booking_events
  for select to authenticated
  using (
    public.booking_is_mine(request_id) or public.booking_is_in_my_domain(request_id) or public.has_role('board', 'admin')
    or exists (select 1 from public.booking_requests b where b.id = request_id and b.client_person_id = public.current_person_id())
  );
create policy "specialists log their replies" on public.booking_events
  for insert to authenticated with check (actor = 'specialist' and public.booking_is_mine(request_id));

-- Grants
grant insert on public.booking_requests, public.proposed_times, public.booking_events to anon, authenticated;
grant select, update on public.booking_requests to authenticated;
grant select on public.proposed_times, public.booking_events to authenticated;
grant all on public.booking_requests, public.proposed_times, public.booking_events to service_role;
