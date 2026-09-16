# Phase 2 plan

Slices in order. Each slice ends in something Kim can click on a preview. Keep RLS-first: every new table gets policies in the same migration.

### 2.1 Auth and roles (no external dependencies)
- Migration: `people` (auth user ↔ person, display name, lang), `memberships` (person, role enum `visitor|client|specialist|domain_lead|board|admin`, optional `domain_id`, status), `organisations` (clients' companies). Helper SQL functions `current_role()` / `has_role(...)` for policies.
- Supabase Auth: magic link (email OTP) first, password optional. Site URL + redirect URLs for preview domains. Custom SMTP only after the email provider exists.
- `proxy.ts`: refresh session via `@supabase/ssr`; guard `/[lang]/portal/**` and `/[lang]/admin/**` by role.
- Pages: `/[lang]/log-ind` (magic link form), `/auth/callback` route handler, `/[lang]/portal` shell.
- Seed Kim as `board`, Andreas as `admin` once emails are known (a migration with placeholders is fine; fill in via SQL).

### 2.2 Admin (closes the phase 1 gap)
- `/[lang]/admin`: applications queue (status enum already exists; add notes + decided_at), contact inbox (mark handled), domain copy editor (writes `domains.name/tagline/blurb/house_description/skills`; public pages revalidate via `revalidatePath`), seats (open/reserve/activate/close), read-only events summary from `daily_domain_metrics`.
- RLS: board/admin select+update on applications, contact_messages, domains, seats; audit table `audit_log` with a trigger on those tables.

### 2.3 Specialists
- Migration: `specialist_profiles` (person, domain, teaser fields public; full fields private), `experience`, `education`, `certifications`, `profile_skills`, `profile_links`, `availability`; storage buckets `portraits` (public), `cvs` (private).
- Invitation flow: accepted application → `seats.reserved` → invite email (or manual link until email exists) → specialist signs in → profile editor on `/[lang]/portal/min-side`.
- CV import: Edge Function or route handler calling the Claude API (`claude-sonnet-5` is enough) to turn a PDF/LinkedIn export into the profile schema for the specialist to approve.
- Public: teaser on domain pages and inside the house (level 2 replaces the "window is open" state when a seat is active); `/[lang]/specialister/[slug]`.

### 2.4 Client access and the CV gate
- `access_requests` table + form on the profile page; board approves → magic link; full profile visible to role `client`.

### 2.5 Booking requests
- `booking_requests`, `booking_events`, `proposed_times`; request dialog (design has a three-step flow) → specialist replies from Min side → `.ics` attachment; first-reply timestamp feeds the response-time KPI.

### 2.6 Email everywhere
- Wire Resend (or chosen provider) into intake actions and the flows above, bilingual templates, custom SMTP for Supabase Auth.
