-- Specialists (roadmap 2.3): the profile behind each seat.
--   specialist_profiles  one per person; teaser columns are public through
--                        the specialist_teasers view, everything else is
--                        private (owner, board/admin, and clients in 2.4)
--   experience, education, certifications  the CV
-- A profile is live (visible on the site) when it is published AND its
-- person holds an active seat in that domain: the seat is Kim's gate
-- (buy-in paid), publishing is the specialist's.
-- Storage: bucket "portraits" (public read) and "cvs" (private).
-- Bilingual free text is i18n_text; skills follow the domains pattern
-- (jsonb {"da": [], "en": []}). Every grant is explicit.

create table public.specialist_profiles (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null unique references public.people(id) on delete cascade,
  domain_id       text not null references public.domains(id) on delete restrict,
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  title           public.i18n_text,                -- role, e.g. "Senior projektleder"
  tagline         public.i18n_text,                -- one line, public
  city            text check (city is null or length(city) <= 80),
  years_in_craft  smallint check (years_in_craft is null or years_in_craft between 0 and 60),
  summary         public.i18n_text,                -- the "about", private
  skills          jsonb not null default '{"da": [], "en": []}'::jsonb,
  languages       text[] not null default '{}',    -- spoken: da, en, de, ...
  rate_text       text check (rate_text is null or length(rate_text) <= 120),   -- private
  weekly_hours    smallint check (weekly_hours is null or weekly_hours between 0 and 60),
  available_from  date,
  booked_until    date,
  website_url     text check (website_url is null or website_url ~* '^https?://'),
  linkedin_url    text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  portrait_path   text,                            -- object in bucket portraits
  cv_path         text,                            -- object in bucket cvs
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.specialist_profiles is 'One profile per person. Live on the site when is_published and the person holds an active seat in domain_id.';

create table public.experience (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.specialist_profiles(id) on delete cascade,
  organisation text not null check (length(organisation) between 1 and 160),
  title        public.i18n_text not null,
  description  public.i18n_text,
  start_date   date,
  end_date     date,                                -- null = ongoing
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);
create index experience_profile_idx on public.experience (profile_id, sort_order, start_date desc);

create table public.education (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.specialist_profiles(id) on delete cascade,
  institution  text not null check (length(institution) between 1 and 160),
  degree       public.i18n_text not null,
  start_year   smallint check (start_year is null or start_year between 1950 and 2100),
  end_year     smallint check (end_year is null or end_year between 1950 and 2100),
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);
create index education_profile_idx on public.education (profile_id, sort_order, end_year desc);

create table public.certifications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.specialist_profiles(id) on delete cascade,
  name         text not null check (length(name) between 1 and 160),
  issuer       text check (issuer is null or length(issuer) <= 160),
  year         smallint check (year is null or year between 1950 and 2100),
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now()
);
create index certifications_profile_idx on public.certifications (profile_id, sort_order, year desc);

create trigger specialist_profiles_set_updated_at before update on public.specialist_profiles
  for each row execute function public.set_updated_at();
create trigger specialist_profiles_audit after insert or update or delete on public.specialist_profiles
  for each row execute function public.audit_row();

-- Helpers for policies (security definer so they can look across tables).
create or replace function public.owns_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.specialist_profiles p
    where p.id = target and p.person_id = public.current_person_id()
  );
$$;

create or replace function public.profile_is_live(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.specialist_profiles p
    join public.seats s on s.holder_person_id = p.person_id and s.domain_id = p.domain_id
    where p.id = target and p.is_published and s.status = 'active'
  );
$$;

revoke all on function public.owns_profile(uuid) from public;
revoke all on function public.profile_is_live(uuid) from public;
grant execute on function public.owns_profile(uuid) to anon, authenticated;
grant execute on function public.profile_is_live(uuid) to anon, authenticated;

-- The public face: teaser columns of live profiles. Definer view, like
-- domain_staffing, so anon needs no access to the base tables.
create or replace view public.specialist_teasers as
select
  p.id,
  p.slug,
  p.domain_id,
  pe.display_name,
  p.title,
  p.tagline,
  p.city,
  p.years_in_craft,
  p.skills,
  p.languages,
  p.available_from,
  p.booked_until,
  p.portrait_path,
  s.position as seat_position
from public.specialist_profiles p
join public.people pe on pe.id = p.person_id
join public.seats s on s.holder_person_id = p.person_id and s.domain_id = p.domain_id and s.status = 'active'
where p.is_published;
comment on view public.specialist_teasers is 'Live specialists, teaser columns only. What the house, the domain pages and the specialist pages show to everyone.';

-- Row level security
alter table public.specialist_profiles enable row level security;
alter table public.experience enable row level security;
alter table public.education enable row level security;
alter table public.certifications enable row level security;

create policy "owner reads own profile" on public.specialist_profiles
  for select to authenticated using (person_id = public.current_person_id());
create policy "owner creates own profile" on public.specialist_profiles
  for insert to authenticated
  with check (person_id = public.current_person_id() and public.has_domain_role(domain_id, 'specialist'));
create policy "owner edits own profile" on public.specialist_profiles
  for update to authenticated
  using (person_id = public.current_person_id()) with check (person_id = public.current_person_id());
create policy "board and admin manage profiles" on public.specialist_profiles
  for all to authenticated using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));
create policy "clients read live profiles" on public.specialist_profiles
  for select to authenticated using (public.has_role('client') and public.profile_is_live(id));

create policy "owner manages own experience" on public.experience
  for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "board and admin manage experience" on public.experience
  for all to authenticated using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));
create policy "clients read live experience" on public.experience
  for select to authenticated using (public.has_role('client') and public.profile_is_live(profile_id));

create policy "owner manages own education" on public.education
  for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "board and admin manage education" on public.education
  for all to authenticated using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));
create policy "clients read live education" on public.education
  for select to authenticated using (public.has_role('client') and public.profile_is_live(profile_id));

create policy "owner manages own certifications" on public.certifications
  for all to authenticated using (public.owns_profile(profile_id)) with check (public.owns_profile(profile_id));
create policy "board and admin manage certifications" on public.certifications
  for all to authenticated using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));
create policy "clients read live certifications" on public.certifications
  for select to authenticated using (public.has_role('client') and public.profile_is_live(profile_id));

-- Inviting is a board decision: the board may create the person, give the
-- specialist role and attach the auth account, without holding admin.
create policy "board invites people" on public.people
  for insert to authenticated with check (public.has_role('board'));
create policy "board links people to accounts" on public.people
  for update to authenticated using (public.has_role('board')) with check (public.has_role('board'));
create policy "board grants specialist roles" on public.memberships
  for insert to authenticated with check (public.has_role('board') and role = 'specialist');
create policy "board changes specialist roles" on public.memberships
  for update to authenticated
  using (public.has_role('board') and role = 'specialist') with check (public.has_role('board') and role = 'specialist');

-- Storage: portraits are public to read, cvs are private. Owners write
-- into their own folder (<person_id>/...), board and admin anywhere.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('portraits', 'portraits', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('cvs', 'cvs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "portraits are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'portraits');
create policy "owner uploads own portrait" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'portraits' and (storage.foldername(name))[1] = public.current_person_id()::text);
create policy "owner replaces own portrait" on storage.objects
  for update to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = public.current_person_id()::text);
create policy "owner removes own portrait" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portraits' and (storage.foldername(name))[1] = public.current_person_id()::text);

create policy "owner reads own cv" on storage.objects
  for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = public.current_person_id()::text);
create policy "owner uploads own cv" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = public.current_person_id()::text);
create policy "owner replaces own cv" on storage.objects
  for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = public.current_person_id()::text);
create policy "owner removes own cv" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = public.current_person_id()::text);
create policy "board and admin read every cv and portrait" on storage.objects
  for select to authenticated
  using (bucket_id in ('cvs', 'portraits') and public.has_role('board', 'admin'));

-- Grants
grant select on public.specialist_teasers to anon, authenticated;
grant select, insert, update, delete on public.specialist_profiles, public.experience, public.education, public.certifications to authenticated;
grant all on public.specialist_profiles, public.experience, public.education, public.certifications to service_role;
