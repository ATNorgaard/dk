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

### 2.2 Admin — landed 17 September
Pages under `/[lang]/admin`: overview, applications queue with notes and decisions, enquiries inbox, domain copy editor (revalidates the public pages), seats editor with the script's guards in RLS, people-and-roles editor (admin writes), numbers, audit log. Migrations `20260917100000_admin.sql` and `20260917110000_audit_actor_fk.sql`. See [runbooks/admin.md](../runbooks/admin.md). The scripts stay as fallbacks. Left: revoke the per-developer secret keys once the board is used to the pages; the six-month retention job for declined applications (pg_cron, later).

### 2.2 Admin (closes the phase 1 gap)
- `/[lang]/admin`: applications queue (status enum already exists; add notes + decided_at), contact inbox (mark handled), domain copy editor (writes `domains.name/tagline/blurb/house_description/skills`; public pages revalidate via `revalidatePath`), seats (open/reserve/activate/close), read-only events summary from `daily_domain_metrics`.
- RLS: board/admin select+update on applications, contact_messages, domains, seats; audit table `audit_log` with a trigger on those tables.
- Seats editor replaces the `domain-seats` script for Kim and the board. The script's commands (`add`, `set`, `remove`, `target`, `override`) and its guards (unique positions 1..12, no deleting seats with holders, `remove` only for open/closed) are the spec for the server actions; keep them in sync until the script is retired.
- Roles editor replaces `pnpm roles` the same way: grant and revoke memberships, create the auth account without sending mail, and show who has signed in. The admin page already lists people and roles; the tiles on it are the slice's checklist.
- Once board/admin policies and `audit_log` exist, revoke the per-developer secret keys used by the script and note it in the runbook.

### 2.3 Specialists — landed 17 September
Migration `20260917130000_specialists.sql`: `specialist_profiles`, `experience`, `education`, `certifications`, the `specialist_teasers` view (live = published + active seat), buckets `portraits` and `cvs` with owner-folder policies, board policies for inviting. Skills and languages are columns on the profile (jsonb, text[]) rather than the `profile_skills`/`profile_links`/`availability` tables the plan listed: same data, fewer joins, and it matches how domains store skills. Invite from the application page (person, account, role, first open seat reserved, empty profile, welcome mail). Min side editor with portrait upload and CV import (`/api/cv-import`, Claude with structured output; needs `ANTHROPIC_API_KEY`). Public: `/[lang]/specialister/[slug]` (teaser for everyone, full CV for clients, board and the owner), cards on the domain page, and the house window at level two shows the first live specialist. See [runbooks/specialists.md](../runbooks/specialists.md). Left: `ANTHROPIC_API_KEY` in Vercel and `.env.local`; a real portrait upload through the browser (the storage policies are verified through the API); the six-month retention job.

### 2.4 Client access and the CV gate — landed 17 September
Migrations `20260917150000_access_requests.sql` (the table, anon insert, board/admin decide, board may grant `client` and create organisations) and `20260917160000_clients_read_specialists.sql` (clients read the people rows of live specialists, for name and contact). The gate on `/[lang]/specialister/[slug]` carries the access-request form; the requester gets a confirmation, the house a notice with a link to the queue. Admin page `/admin/adgang`: approve creates person, account, organisation from the company name, the `client` role and sends the sign-in mail with a link back to the page they came from; decline sends a polite mail. The client then sees the full CV. See [runbooks/admin.md](../runbooks/admin.md). Left: the ninety-day deletion of declined and stale requests (pg_cron, with the other retention jobs).

### 2.5 Booking requests — landed 17 September
Migration `20260917180000_bookings.sql`: `booking_requests`, `proposed_times`, `booking_events`, RLS per party, a token for the requester. Three-step request on every live specialist page; the specialist accepts, proposes another time or declines from Min side; the requester accepts a counter-proposal or cancels from a token page; "Aftalt" mails both sides with a calendar file; `first_reply_at` is the response-time KPI, shown per request and as a median under Admin → Møder. See [runbooks/bookings.md](../runbooks/bookings.md). Left: the daily nudge for unanswered requests, the "someone else in the domain" path after a decline, and real calendar slots (phase 4).

### 2.6 Email everywhere — done with 2.5
`src/lib/email/` (provider interface, Resend over HTTP with attachments, log fallback), bilingual templates for every flow: intake, invitation, access, bookings; Supabase Auth on Resend's SMTP. Left: the weekly summary to Kim (phase 3) and the Resend hand-over to Kim's ownership ([runbooks/email.md](../runbooks/email.md)).
