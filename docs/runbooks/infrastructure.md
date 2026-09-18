# Accounts and infrastructure

| Thing | Where | Notes |
|---|---|---|
| Code | github.com/TrustUsConsult/dk | `main` is the integration branch. Work in `phase-N-*` branches, PR to main. |
| Supabase | project `fghgbjfvdtuhxfmqgzgo` ("TUC"), org owned by TrustUsConsult, region eu-central-1 Frankfurt | CLI is linked (`supabase/.temp`). `pnpm db:push` applies migrations. Auth settings we manage (site URL, redirect list, magic-link mail) are declared in `supabase/config.toml` and pushed with `supabase config push` after a `config diff`; see [auth.md](auth.md). |
| Vercel | team `trust-us-consult`, project `trustusconsult-dk` | `vercel.json` pins framework `nextjs` and region `fra1`. Env vars set for prod/preview/dev. Since 16 September the Vercel–Supabase integration is installed: it fills the `SUPABASE_*` and `POSTGRES_*` variables, and pushes deploy through Git (main → production, other branches → preview). Deployment protection is on (team login). **Previews are the staging environment** (agreed 17 September): every PR gets a login-protected preview URL, Andreas reviews there, and only then is the PR merged. A preview whose PR does not touch `supabase/` runs against the **live** project (`NEXT_PUBLIC_SUPABASE_URL` for Preview points at TUC), so what you do there is real. `SUPABASE_SECRET_KEY` is set for Preview since 17 September, so the token pages, invitations and notice mails work on previews too. |
| Supabase branching | one preview branch per git branch with a PR, created by the integration | The preview deployment's `NEXT_PUBLIC_SUPABASE_URL` points at the **branch** database, not the main project: fresh schema from `supabase/migrations`, seeded from `seed.sql`, no people or roles. Vercel starts building the moment the branch is created, before it has migrated; `pnpm build` therefore runs `scripts/wait-for-db.mjs` first, which on `VERCEL_ENV=preview` polls the branch's API until `domains` answers (grants and seed in place), up to four minutes, then lets `next build` go. Production and local builds skip the wait. If it still times out, the branch itself failed: `npx supabase branches list --experimental` shows status. Sign-in on a preview needs roles granted on that branch (`pnpm roles` against the branch keys from `branches get`). |
| Domain | trustusconsult.dk, in Kim's registrar | Live on Vercel since 16 September 2026: `www.trustusconsult.dk` serves the site, the apex redirects to it. It is also the Supabase auth site URL. |
| Email | Resend, domain `trustusconsult.dk` verified (EU region), account created by Andreas 17 September, to be handed to Kim | App mail from `src/lib/email/`; Supabase Auth uses Resend's SMTP relay (`[auth.email.smtp]` in `config.toml`, password from `RESEND_API_KEY` in the shell at push time). Key and `EMAIL_FROM` in `.env.local` and Vercel. Setup and hand-over in [email.md](email.md). |

**Traps for agents**
- A Supabase MCP server in Andreas's sessions points at his *personal* project `etpxfpgtxbjhfakgutwc`. Always check `get_project_url` before using MCP; prefer the linked CLI.
- The Vercel MCP has no access to the team. Use the Vercel CLI.
- The GitHub app for Vercel is **not** installed on the TrustUsConsult org, so pushes do not deploy. `vercel git connect` fails until Kim installs it.
- Do not run `pnpm build` while `pnpm dev` is running; it corrupts the dev server's `.next`. Stop dev first.
- A hidden Claude browser pane freezes CSS transitions, `requestAnimationFrame` and IntersectionObserver, and does not move focus. Verify *state* (classes, attributes, DOM) there; verify *animation* in a visible browser.

## Launch preparation (18 September 2026)

- **Rate limits.** The four public forms (application, access request, contact, booking) go through `src/lib/rate-limit.ts`: per IP per hour and per email per day (limits in `LIMITS`), counted in Postgres by `rate_limit_hit()` on the `rate_events` table (migration `20260918090000_launch_prep.sql`). Keys are salted hashes (`EVENTS_SALT`), never raw IPs or addresses; rows are deleted after two days. Only the service role may call the function. The limiter fails open: if the call errors, the form goes through and the error is logged. Over the limit the form shows "For mange forsøg på kort tid".
- **Daily booking nudge.** `/api/cron/nudge`, see [bookings.md](bookings.md). `CRON_SECRET` is set in Vercel for Production and in `.env.local`.
- **Analytics events.** `booking_created` (with the domain) and `booking_first_reply` (on the specialist's first reply) join the event types, plus `access_request`. They are recorded server-side in the actions; the `daily_domain_metrics` view does not count them yet.
- **Error tracking.** No third-party tracker. `src/instrumentation.ts` writes every uncaught server error to the runtime log as one JSON line with the digest, path and route; visitors see `[lang]/error.tsx` with the same digest, `global-error.tsx` if the layout itself fails. The deliberate test error from the checklist: `GET /api/health?boom=1` with the `CRON_SECRET` bearer token throws; look for `"level":"error"` in Vercel's runtime logs. `GET /api/health` without it answers `{ ok: true }`.
- **Sitemap and robots.** `/sitemap.xml` lists the fixed pages, all domains and the live specialists in both languages with hreflang alternates; `/robots.txt` disallows portal, admin, booking pages, log-in, auth and the API.
- **Redirects.** `next.config.ts`: the prototype's file-name URLs (`index.html`, `landing.html`, `freelancere.html`, `freelancers.html`, `portal.html`) redirect permanently to the matching pages; any other `.html` goes to the front page.
- **Legal pages.** `/[lang]/privatliv` and `/[lang]/vilkaar` from `src/content/legal.ts`, rendered by `LegalPage`. Both carry a draft notice until the legal domain has reviewed them; the open points for Kim are marked `[ ]` in the text (address and CVR, contracting party, invoicing and payment terms).

## Retention (19 September 2026)

Vercel Cron calls `/api/cron/retention` daily at 04:00 UTC with `CRON_SECRET`; `?dry=1` reports the counts without deleting. Rules and periods are in `src/lib/retention.ts` and match the privacy notice (`src/content/legal.ts`); change both together.

| What | When | How |
|---|---|---|
| Contact-form enquiries | 12 months after they were sent | row deleted |
| Declined applications | 6 months after the decision | row and notes deleted |
| Access requests | declined: 90 days after the decision; never answered: 90 days after arrival | row deleted |
| Meeting requests | 12 months after the agreed time, or the last proposed one | request, times and events deleted |
| Departed specialists | 30 days after the specialist membership was revoked, unless re-admitted | profile with its CV rows, portrait and CV files deleted; the person and auth account too when no other membership keeps them |
| Client accounts | 12 months after the last sign-in (creation, if never signed in), only when the person holds no other role | person, memberships and auth account deleted |
| Rate-limit rows | 2 days | rows deleted |

Run by hand: `curl -H "Authorization: Bearer $CRON_SECRET" "https://www.trustusconsult.dk/api/cron/retention?dry=1"`. The response and a JSON log line carry candidates and deletions per rule. Departures: when the board revokes a specialist's membership under Personer, the 30-day clock starts; to keep a departed specialist's profile longer, leave the membership active and set the seat to `notice`.
