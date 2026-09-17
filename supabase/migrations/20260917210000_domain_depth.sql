-- Domain pages with depth: a multi-paragraph description and a list of
-- typical briefs per domain, both bilingual and edited by the board under
-- Admin → Domæner. The copy itself is seeded (supabase/seed.sql) and was
-- applied to the live project with targeted updates on 17 September 2026.

alter table public.domains
  add column description   public.i18n_text,
  add column typical_tasks jsonb not null default '{"da": [], "en": []}'::jsonb
    check (typical_tasks ? 'da' and typical_tasks ? 'en');

comment on column public.domains.description   is 'Long description for the domain page; paragraphs separated by a blank line. {"da": ..., "en": ...}';
comment on column public.domains.typical_tasks is 'Typical briefs shown on the domain page. {"da": [...], "en": [...]}';

-- Grants: table-level select on public.domains is already granted to anon
-- and authenticated (20260917080000_grants.sql); new columns fall under it.
-- Restated so the migration carries its own grants, as every migration must.
grant select on public.domains to anon, authenticated;
