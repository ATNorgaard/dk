-- Client access (roadmap 2.4): a visitor asks to read the full CVs, the
-- board approves, the person becomes a client and signs in by magic link.
--   access_requests  the form behind the CV gate; anon may insert, board and
--                    admin read and decide
-- The board may also grant the client role (as it may grant specialist).

create type public.access_status as enum ('received', 'approved', 'declined');

create table public.access_requests (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  lang          text not null default 'da' check (lang in ('da', 'en')),
  full_name     text not null check (length(full_name) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  company       text check (company is null or length(company) <= 160),
  message       text check (message is null or length(message) <= 2000),   -- what they are looking for
  source_slug   text,                                                        -- the specialist page they came from
  consent_at    timestamptz not null,
  status        public.access_status not null default 'received',
  decided_at    timestamptz,
  decided_by    uuid references public.people(id) on delete set null,
  internal_note text
);
comment on table public.access_requests is 'Requests to read full CVs. Personal data: expired requests are deleted after ninety days (job later).';
create index access_requests_status_idx on public.access_requests (status, created_at desc);

create trigger access_requests_set_updated_at before update on public.access_requests
  for each row execute function public.set_updated_at();
create trigger access_requests_audit after insert or update or delete on public.access_requests
  for each row execute function public.audit_row();

alter table public.access_requests enable row level security;

-- The public may ask, never read. Decision fields must arrive at defaults.
create policy "anyone may ask for access" on public.access_requests
  for insert to anon, authenticated
  with check (status = 'received' and decided_at is null and decided_by is null and internal_note is null);
create policy "board and admin read access requests" on public.access_requests
  for select to authenticated using (public.has_role('board', 'admin'));
create policy "board and admin decide access requests" on public.access_requests
  for update to authenticated
  using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));

-- Approving creates a client: the board may grant that role too.
drop policy "board grants specialist roles" on public.memberships;
create policy "board grants specialist and client roles" on public.memberships
  for insert to authenticated with check (public.has_role('board') and role in ('specialist', 'client'));
drop policy "board changes specialist roles" on public.memberships;
create policy "board changes specialist and client roles" on public.memberships
  for update to authenticated
  using (public.has_role('board') and role in ('specialist', 'client'))
  with check (public.has_role('board') and role in ('specialist', 'client'));
create policy "board creates organisations" on public.organisations
  for insert to authenticated with check (public.has_role('board'));

-- Grants
grant insert on public.access_requests to anon, authenticated;
grant select, update on public.access_requests to authenticated;
grant insert on public.organisations to authenticated;
grant all on public.access_requests to service_role;
