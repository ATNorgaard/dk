# Phase 2 plan

Updated 16 September 2026.

## Landed since the handover (14 September)

- Vercel Web Analytics and Speed Insights in the `[lang]` root layout, alongside the first-party events.
- White page ground with the house fading into it at the foot; the site no longer follows the OS colour scheme (decision 0001).
- Seats per domain can be managed today with the `domain-seats` skill and its script (see [runbooks/admin-seats.md](../runbooks/admin-seats.md)). It uses the project's secret key, so it is an admin-only stopgap until 2.2.
- Handover doc split into `docs/` by purpose; `CLAUDE.md` carries the working agreements.
- The domain `www.trustusconsult.dk` is live on Vercel.
- **2.1 Auth and roles landed 16 September** on branch `phase-2-auth`: migration `people`/`organisations`/`memberships` with role helpers and RLS, magic-link sign-in with a bilingual token-hash mail, session refresh and route guard in the proxy, `/[lang]/log-ind`, `/auth/callback`, `/[lang]/portal` shell, `/[lang]/admin` shell with the people-and-roles table, `pnpm roles` for granting roles. Andreas holds `admin`. See [runbooks/auth.md](../runbooks/auth.md). Left from 2.1: Kim's `board` role (needs his login email), the Supabase security advisors on the new tables (the MCP points at the wrong project; check in the dashboard), and password as an optional second way in (not needed until someone asks).

## Slices in order

Each slice ends in something Kim can click on a preview. Keep RLS-first: every new table gets policies in the same migration.

### 2.1 Auth and roles — done, see above

### 2.2 Admin (closes the phase 1 gap)
- `/[lang]/admin`: applications queue (status enum already exists; add notes + decided_at), contact inbox (mark handled), domain copy editor (writes `domains.name/tagline/blurb/house_description/skills`; public pages revalidate via `revalidatePath`), seats (open/reserve/activate/close), read-only events summary from `daily_domain_metrics`.
- RLS: board/admin select+update on applications, contact_messages, domains, seats; audit table `audit_log` with a trigger on those tables.
- Seats editor replaces the `domain-seats` script for Kim and the board. The script's commands (`add`, `set`, `remove`, `target`, `override`) and its guards (unique positions 1..12, no deleting seats with holders, `remove` only for open/closed) are the spec for the server actions; keep them in sync until the script is retired.
- Roles editor replaces `pnpm roles` the same way: grant and revoke memberships, create the auth account without sending mail, and show who has signed in. The admin page already lists people and roles; the tiles on it are the slice's checklist.
- Once board/admin policies and `audit_log` exist, revoke the per-developer secret keys used by the script and note it in the runbook.

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
- Started 16 September: `src/lib/email/` (provider interface, Resend over HTTP, log fallback), bilingual templates, intake confirmations and internal notices wired in. Left: the manual Resend setup ([runbooks/email.md](../runbooks/email.md)), custom SMTP for Supabase Auth once the domain is verified, and templates for the flows in 2.3 to 2.5 as they land.
