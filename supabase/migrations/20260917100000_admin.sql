-- Admin (roadmap 2.2): what the board and admin may read and change, plus
-- an audit trail of who changed what.
--   application_notes  internal notes on an application
--   audit_log          one row per insert/update/delete on the tables the
--                      admin edits, written by a trigger, readable by board/admin
-- Policies open applications, contact messages, domains and seats to
-- board and admin (domain leads read applications for their own domain).
-- Every grant is explicit (see CLAUDE.md).

create table public.application_notes (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null references public.applications(id) on delete cascade,
  author_person_id  uuid references public.people(id) on delete set null,
  body              text not null check (length(body) between 1 and 4000),
  created_at        timestamptz not null default now()
);
comment on table public.application_notes is 'Internal notes on an application, in the order written.';
create index application_notes_application_idx on public.application_notes (application_id, created_at);

create table public.audit_log (
  id               bigint generated always as identity primary key,
  at               timestamptz not null default now(),
  actor_user_id    uuid,
  actor_person_id  uuid,
  table_name       text not null,
  row_id           text not null,
  action           text not null check (action in ('insert', 'update', 'delete')),
  old_data         jsonb,
  new_data         jsonb
);
comment on table public.audit_log is 'Who changed what. Written by the audit_row trigger; actor is the signed-in user (null for service-role tooling).';
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row_id text;
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_row_id := coalesce(v_old ->> 'id', '');
  elsif tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_row_id := coalesce(v_new ->> 'id', '');
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row_id := coalesce(v_new ->> 'id', '');
    -- updated_at alone is noise
    if (v_old - 'updated_at') = (v_new - 'updated_at') then
      return new;
    end if;
  end if;
  insert into public.audit_log (actor_user_id, actor_person_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    (select id from public.people where user_id = auth.uid() limit 1),
    tg_table_name,
    v_row_id,
    lower(tg_op),
    v_old,
    v_new
  );
  return coalesce(new, old);
end $$;

create trigger applications_audit after insert or update or delete on public.applications
  for each row execute function public.audit_row();
create trigger application_notes_audit after insert or update or delete on public.application_notes
  for each row execute function public.audit_row();
create trigger contact_messages_audit after insert or update or delete on public.contact_messages
  for each row execute function public.audit_row();
create trigger domains_audit after insert or update or delete on public.domains
  for each row execute function public.audit_row();
create trigger seats_audit after insert or update or delete on public.seats
  for each row execute function public.audit_row();
create trigger people_audit after insert or update or delete on public.people
  for each row execute function public.audit_row();
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function public.audit_row();
create trigger organisations_audit after insert or update or delete on public.organisations
  for each row execute function public.audit_row();

-- Row level security
alter table public.application_notes enable row level security;
alter table public.audit_log enable row level security;

create policy "board and admin read notes" on public.application_notes
  for select to authenticated using (public.has_role('board', 'admin'));
create policy "board and admin write notes" on public.application_notes
  for insert to authenticated with check (public.has_role('board', 'admin'));

create policy "board and admin read the audit log" on public.audit_log
  for select to authenticated using (public.has_role('board', 'admin'));

create policy "board and admin read applications" on public.applications
  for select to authenticated using (public.has_role('board', 'admin'));
create policy "domain leads read their domain's applications" on public.applications
  for select to authenticated
  using (domain_id is not null and public.has_domain_role(domain_id, 'domain_lead'));
create policy "board and admin decide applications" on public.applications
  for update to authenticated
  using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));

create policy "board and admin read enquiries" on public.contact_messages
  for select to authenticated using (public.has_role('board', 'admin'));
create policy "board and admin handle enquiries" on public.contact_messages
  for update to authenticated
  using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));

create policy "board and admin read every domain" on public.domains
  for select to authenticated using (public.has_role('board', 'admin'));
create policy "board and admin edit domains" on public.domains
  for update to authenticated
  using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));

create policy "board and admin read seats" on public.seats
  for select to authenticated using (public.has_role('board', 'admin'));
create policy "board and admin add seats" on public.seats
  for insert to authenticated with check (public.has_role('board', 'admin'));
create policy "board and admin change seats" on public.seats
  for update to authenticated
  using (public.has_role('board', 'admin')) with check (public.has_role('board', 'admin'));
-- Same guard as the seats script: only empty open/closed seats may go.
create policy "board and admin remove empty seats" on public.seats
  for delete to authenticated
  using (public.has_role('board', 'admin') and status in ('open', 'closed') and holder_person_id is null);

-- Grants
grant select, insert on public.application_notes to authenticated;
grant select on public.audit_log to authenticated;
grant update on public.applications, public.contact_messages, public.domains to authenticated;
grant insert, update, delete on public.seats to authenticated;
grant all on public.application_notes, public.audit_log to service_role;
grant usage, select on all sequences in schema public to service_role;
