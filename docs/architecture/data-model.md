# Data model

Schema changes are migration files only (see `CLAUDE.md`). Summary of what each migration adds:

- `20260913200000_house.sql` — `domains` (fixed ids = house window ids, bilingual jsonb copy, `target_seats`), `domain_relationships` (neighbour pairs, `a < b`), `seats` (status open/reserved/active/notice/closed), view `domain_staffing` (derived status: `needs` until active seats reach target). Public read on published domains and relationships; seats exposed only as counts through the view.
- `20260914090000_intake.sql` — `applications` (specialists), `contact_messages` (clients), `events` (first-party analytics), view `daily_domain_metrics`. Anon may **insert only**, with checks that internal fields (`status`, `handled_at`, `internal_note`, `decided_at`) arrive at defaults. Nobody can read these yet; that needs the role tables of phase 2.
- `supabase/seed.sql` — fifteen domains with DA/EN copy and three open seats each. Idempotent upserts.
