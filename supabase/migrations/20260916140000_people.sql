-- Identity: who is signed in and what they may do.
--   people          one row per person; linked to auth.users once they have signed in
--   organisations   clients' companies
--   memberships     a person's roles; the role on this row is what policies check
-- Helper functions expose the current person's id and roles to policies. A
-- person can hold several memberships (specialist in one domain, board).
-- Nothing here is readable by the public; a person sees their own rows,
-- board and admin see everyone, only admin writes.

create type public.member_role as enum
  ('visitor', 'client', 'specialist', 'domain_lead', 'board', 'admin');

create type public.membership_status as enum ('invited', 'active', 'revoked');

create table public.organisations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 160),
  website     text check (website is null or website ~* '^https?://'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.organisations is 'Clients'' companies. A client membership may point at one.';

create table public.people (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null,
  email         text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  display_name  text not null check (length(display_name) between 1 and 120),
  lang          text not null default 'da' check (lang in ('da', 'en')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.people is 'One row per person. user_id is null until the person signs in for the first time; the email links the two.';
comment on column public.people.email is 'Lower-cased. Attaches the auth user on first sign-in, so people can be given roles before they have an account.';

create table public.memberships (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.people(id) on delete cascade,
  role             public.member_role not null,
  domain_id        text references public.domains(id) on delete cascade,
  organisation_id  uuid references public.organisations(id) on delete set null,
  status           public.membership_status not null default 'active',
  granted_by       uuid references public.people(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique nulls not distinct (person_id, role, domain_id),
  check (role not in ('specialist', 'domain_lead') or domain_id is not null),
  check (role in ('specialist', 'domain_lead') or domain_id is null),
  check (role = 'client' or organisation_id is null)
);
comment on table public.memberships is 'Roles per person. specialist and domain_lead carry a domain; client may carry an organisation; board and admin carry neither.';
create index memberships_person_idx on public.memberships (person_id);
create index memberships_domain_idx on public.memberships (domain_id) where domain_id is not null;

alter table public.seats
  add constraint seats_holder_person_fk
  foreign key (holder_person_id) references public.people(id) on delete set null;

create trigger organisations_set_updated_at before update on public.organisations
  for each row execute function public.set_updated_at();
create trigger people_set_updated_at before update on public.people
  for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- Keep people.email lower-cased so the sign-in link-up is exact.
create or replace function public.people_normalise_email()
returns trigger language plpgsql as $$
begin
  new.email = lower(trim(new.email));
  return new;
end $$;
create trigger people_normalise_email before insert or update of email on public.people
  for each row execute function public.people_normalise_email();

-- When an auth user appears (first magic link), attach it to the person with
-- the same email, or create a person if nobody invited them ahead of time.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(new.email));
  v_lang text := coalesce(new.raw_user_meta_data ->> 'lang', 'da');
  v_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(v_email, '@', 1)
  );
begin
  if v_email is null or v_email = '' then return new; end if;
  if v_lang not in ('da', 'en') then v_lang := 'da'; end if;
  update public.people set user_id = new.id where email = v_email and user_id is null;
  if not found then
    insert into public.people (user_id, email, display_name, lang)
    values (new.id, v_email, left(v_name, 120), v_lang)
    on conflict (email) do nothing;
  end if;
  return new;
end $$;
comment on function public.handle_new_auth_user is 'Links a new auth user to the person with the same email, or creates the person.';

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Who am I, for policies. Security definer so a policy on memberships can
-- call these without recursing into memberships' own policies.
create or replace function public.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.people where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_roles()
returns public.member_role[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.role), '{}')
  from public.memberships m
  join public.people p on p.id = m.person_id
  where p.user_id = auth.uid() and m.status = 'active';
$$;

create or replace function public.has_role(variadic roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.people p on p.id = m.person_id
    where p.user_id = auth.uid() and m.status = 'active' and m.role = any (roles)
  );
$$;

-- Same, scoped to one domain: the role there, or board/admin anywhere.
create or replace function public.has_domain_role(target_domain text, variadic roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    join public.people p on p.id = m.person_id
    where p.user_id = auth.uid() and m.status = 'active'
      and (
        (m.role = any (roles) and m.domain_id = target_domain)
        or m.role in ('board', 'admin')
      )
  );
$$;

revoke all on function public.current_person_id() from public;
revoke all on function public.current_roles() from public;
revoke all on function public.has_role(variadic public.member_role[]) from public;
revoke all on function public.has_domain_role(text, variadic public.member_role[]) from public;
grant execute on function public.current_person_id() to authenticated;
grant execute on function public.current_roles() to authenticated;
grant execute on function public.has_role(variadic public.member_role[]) to authenticated;
grant execute on function public.has_domain_role(text, variadic public.member_role[]) to authenticated;

-- Row level security
alter table public.organisations enable row level security;
alter table public.people enable row level security;
alter table public.memberships enable row level security;

create policy "people read themselves" on public.people
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "board and admin read everyone" on public.people
  for select to authenticated
  using (public.has_role('board', 'admin'));
create policy "people edit their own name and language" on public.people
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "admin manages people" on public.people
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "people read their own memberships" on public.memberships
  for select to authenticated
  using (person_id = public.current_person_id());
create policy "board and admin read all memberships" on public.memberships
  for select to authenticated
  using (public.has_role('board', 'admin'));
create policy "admin manages memberships" on public.memberships
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

create policy "members read their own organisation" on public.organisations
  for select to authenticated
  using (
    public.has_role('board', 'admin')
    or id in (
      select organisation_id from public.memberships
      where person_id = public.current_person_id() and organisation_id is not null
    )
  );
create policy "admin manages organisations" on public.organisations
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));
