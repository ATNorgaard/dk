# Seats schema reference

Source of truth: `supabase/migrations/20260913200000_house.sql` and `supabase/seed.sql`.
This file is a summary; if they disagree, the migration wins.

## Domain ids (fixed, match the house windows)

| id | Danish name | English name |
| --- | --- | --- |
| mentor | Mentor & Coach | Mentor & Coach |
| salg | Salg & Marketing | Sales & Marketing |
| bestyrelse | Bestyrelse | Board & Governance |
| invest | Investering & Projekt | Investment & Finance |
| consulting | Consulting | Consulting |
| ai | AI & IT | AI & IT |
| hr | HR & Rekruttering | HR & Recruitment |
| advisory | Advisory | Advisory |
| supply | Supply Chain & Logistik | Supply Chain & Logistics |
| disruption | Disruption & Innovation | Innovation & New Ventures |
| digital | Digital Web & Markedsføring | Digital & Marketing |
| projekt | Projektledelse | Project Management |
| management | Management Consulting | Management Consulting |
| juridisk | Juridisk Rådgiver | Legal Advisory |
| automation | Automation & Produktion | Automation & Production |

## `public.seats`

| column | type | notes |
| --- | --- | --- |
| id | uuid | default `gen_random_uuid()` |
| domain_id | text | FK to `domains.id`, cascade delete |
| position | smallint | 1..12, unique per domain |
| status | seat_status | `open`, `reserved`, `active`, `notice`, `closed`; default `open` |
| holder_person_id | uuid | no FK yet (people tables are phase 2) |
| buy_in_paid_at | timestamptz | |
| notice_given_at | timestamptz | |
| ends_at | date | |
| note | i18n_text | jsonb `{"da": "...", "en": "..."}`; both keys required |
| created_at, updated_at | timestamptz | `updated_at` maintained by trigger |

RLS is enabled with no policies for anon or authenticated, so seat rows are only readable
and writable with the service role (secret key). Counts are public through the view.

## `public.domains` columns the skill touches

| column | type | notes |
| --- | --- | --- |
| target_seats | smallint | 0..12, default 3 |
| status_override | domain_status | `healthy`, `needs`, `full` or null (derived) |

## `public.domain_staffing` view

```sql
select d.id, d.slug, d.sort_order, d.name, d.target_seats,
  count(s.id) filter (where s.status = 'active') as active_seats,
  count(s.id) filter (where s.status = 'open')   as open_seats,
  coalesce(d.status_override,
    case when count(s.id) filter (where s.status = 'active') = 0 then 'needs'
         when count(s.id) filter (where s.status = 'active') < d.target_seats then 'needs'
         else 'healthy' end::public.domain_status) as status
from public.domains d
left join public.seats s on s.domain_id = d.id
where d.is_published
group by d.id;
```

Note that the view never yields `full` by itself; `full` only appears through
`status_override`.

## Seed pattern for bulk seats (SQL, guarded MCP path only)

```sql
insert into public.seats (domain_id, position, status)
select d.id, p, 'open'
from public.domains d, generate_series(1, 4) as p
on conflict (domain_id, position) do nothing;
```

Change `4` to the number of seats every domain should end up with. Existing positions are
left untouched.
