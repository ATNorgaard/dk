-- The house: fifteen domains, their neighbour relationships and the seats in
-- each domain. Domain IDs are the fixed window IDs of the trustus-house
-- artwork and must never change; names may.

create extension if not exists "pgcrypto";

-- Bilingual text is stored as jsonb {"da": "...", "en": "..."} so every copy
-- field carries both languages in one column.
create domain public.i18n_text as jsonb
  check (value ? 'da' and value ? 'en');

create type public.domain_status as enum ('healthy', 'needs', 'full');

create table public.domains (
  id            text primary key,
  sort_order    smallint not null unique check (sort_order between 1 and 15),
  slug          text not null unique,
  name          public.i18n_text not null,
  tagline       public.i18n_text,
  blurb         public.i18n_text,
  house_description public.i18n_text,
  skills        jsonb not null default '{"da": [], "en": []}'::jsonb,
  target_seats  smallint not null default 3 check (target_seats between 0 and 12),
  status_override public.domain_status,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.domains is 'The fifteen domains (windows) of the house.';
comment on column public.domains.id is 'Fixed window id from the house artwork, e.g. ai, salg, bestyrelse.';
comment on column public.domains.status_override is 'Manual override for the map status; null means derived from seats.';

create table public.domain_relationships (
  domain_a text not null references public.domains(id) on delete cascade,
  domain_b text not null references public.domains(id) on delete cascade,
  primary key (domain_a, domain_b),
  check (domain_a < domain_b)
);
comment on table public.domain_relationships is 'Undirected pairs; the windows that light up together. Stored with domain_a < domain_b.';

create type public.seat_status as enum ('open', 'reserved', 'active', 'notice', 'closed');

create table public.seats (
  id          uuid primary key default gen_random_uuid(),
  domain_id   text not null references public.domains(id) on delete cascade,
  position    smallint not null check (position between 1 and 12),
  status      public.seat_status not null default 'open',
  holder_person_id uuid,
  buy_in_paid_at timestamptz,
  notice_given_at timestamptz,
  ends_at     date,
  note        public.i18n_text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (domain_id, position)
);
comment on table public.seats is 'One row per seat in a domain. Active seats drive the recruiting state on the house and map.';

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger domains_set_updated_at before update on public.domains
  for each row execute function public.set_updated_at();
create trigger seats_set_updated_at before update on public.seats
  for each row execute function public.set_updated_at();

-- Derived staffing status used by the map and the freelancer page.
create or replace view public.domain_staffing as
select
  d.id,
  d.slug,
  d.sort_order,
  d.name,
  d.target_seats,
  count(s.id) filter (where s.status = 'active') as active_seats,
  count(s.id) filter (where s.status = 'open')   as open_seats,
  coalesce(
    d.status_override,
    case
      when count(s.id) filter (where s.status = 'active') = 0 then 'needs'
      when count(s.id) filter (where s.status = 'active') < d.target_seats then 'needs'
      else 'healthy'
    end::public.domain_status
  ) as status
from public.domains d
left join public.seats s on s.domain_id = d.id
where d.is_published
group by d.id;

-- Row level security: the house is public to read, written only by the
-- service role (admin tooling) until the membership tables land.
alter table public.domains enable row level security;
alter table public.domain_relationships enable row level security;
alter table public.seats enable row level security;

create policy "domains are public" on public.domains
  for select using (is_published);
create policy "relationships are public" on public.domain_relationships
  for select using (true);
-- Seats expose only counts through the view; direct rows stay private.
