-- The audit log's actor columns had no foreign keys, so the admin page could
-- not embed the actor's name (PostgREST needs a declared relationship) and
-- showed an empty log. Declare it; deleting a person keeps their log rows.

alter table public.audit_log
  add constraint audit_log_actor_person_fk
  foreign key (actor_person_id) references public.people(id) on delete set null;
