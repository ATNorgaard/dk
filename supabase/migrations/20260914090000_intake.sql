-- Intake: what the public site writes into the house before anyone signs in.
--   applications      specialists applying for a seat
--   contact_messages  clients writing about a brief
--   events            first-party analytics (no personal data)
-- All three accept inserts from the anon role under strict column checks and
-- expose nothing back. Reading is for signed-in board/admin roles, which land
-- with the membership tables in phase 2.

create type public.application_status as enum
  ('received', 'interview', 'accepted', 'declined', 'on_hold');

create table public.applications (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  lang            text not null default 'da' check (lang in ('da', 'en')),
  domain_id       text references public.domains(id) on delete set null,
  craft           text,                          -- free text when the domain is unclear
  full_name       text not null check (length(full_name) between 2 and 120),
  email           text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text check (phone is null or length(phone) <= 40),
  linkedin_url    text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  years_in_craft  smallint check (years_in_craft between 0 and 60),
  cases           text check (cases is null or length(cases) <= 4000),
  reference_note  text check (reference_note is null or length(reference_note) <= 1000),
  message         text check (message is null or length(message) <= 4000),
  consent_at      timestamptz not null,          -- privacy notice accepted
  status          public.application_status not null default 'received',
  decided_at      timestamptz,
  internal_note   text,
  check (domain_id is not null or craft is not null)
);
comment on table public.applications is 'Specialist applications from the freelancer page. Personal data: retention six months after decline.';

create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lang        text not null default 'da' check (lang in ('da', 'en')),
  domain_id   text references public.domains(id) on delete set null,
  full_name   text not null check (length(full_name) between 2 and 120),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company     text check (company is null or length(company) <= 160),
  message     text not null check (length(message) between 5 and 4000),
  consent_at  timestamptz not null,
  handled_at  timestamptz,
  internal_note text
);
comment on table public.contact_messages is 'Client enquiries from the contact block on the landing and domain pages.';

create table public.events (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  type        text not null check (type in ('page_view', 'domain_view', 'house_window', 'house_inside', 'application', 'contact')),
  path        text not null check (length(path) <= 300),
  lang        text check (lang in ('da', 'en')),
  domain_id   text references public.domains(id) on delete set null,
  referrer_host text check (referrer_host is null or length(referrer_host) <= 120),
  visitor_day text check (visitor_day is null or length(visitor_day) = 16)  -- daily rotating hash, never an identifier across days
);
comment on table public.events is 'First-party analytics. No IP, no user agent, no cookies; visitor_day is a salted hash that rotates daily.';
create index events_occurred_at_idx on public.events (occurred_at desc);
create index events_domain_day_idx on public.events (domain_id, occurred_at desc);

create trigger applications_set_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- Row level security
alter table public.applications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.events enable row level security;

-- The public may write, never read. Status and internal fields must arrive at
-- their defaults; the checks stop a client from pre-approving itself.
create policy "anyone may apply" on public.applications
  for insert to anon, authenticated
  with check (status = 'received' and decided_at is null and internal_note is null);

create policy "anyone may write to the house" on public.contact_messages
  for insert to anon, authenticated
  with check (handled_at is null and internal_note is null);

create policy "anyone may record an event" on public.events
  for insert to anon, authenticated
  with check (true);

-- Daily rollup used by the map and the board. Definer view: exposes counts only.
create or replace view public.daily_domain_metrics as
select
  date_trunc('day', occurred_at)::date as day,
  domain_id,
  count(*) filter (where type in ('domain_view', 'house_inside')) as domain_views,
  count(*) filter (where type = 'house_window') as window_hovers,
  count(*) filter (where type = 'contact') as contacts,
  count(*) filter (where type = 'application') as applications,
  count(distinct visitor_day) as visitors
from public.events
where domain_id is not null
group by 1, 2;
