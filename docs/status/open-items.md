# Open items

## From phase 1 (not blocked on Kim)

- [ ] Privacy and terms pages exist since 18 September (`/privatliv`, `/vilkaar`) as drafts with a visible notice. Left: the legal domain reads them, Kim fills the `[ ]` points (address, CVR, contracting party, invoicing terms), then the notice comes off in `src/content/legal.ts`.
- [ ] Canonical names for domains 04 (`Investering & Projekt` vs `Investment & Finance`) and 10 (`Disruption & Innovation` vs `Innovation & New Ventures`) once Kim decides; one-line change in `seed.sql`, re-run `pnpm db:push:seed`.
- [x] Keyboard walkthrough 18 September: Tab reaches skip link, header, every house window (role button, labelled), Enter zooms in; the focus indication is the lamp overlay (`data-focus`), not a CSS ring. Andreas to glance at it once in a visible browser.
- [x] `daily_domain_metrics`, `domain_staffing` and `specialist_teasers` are security-definer views on purpose (counts and the published-plus-active subset); the advisor flags them, accepted 18 September.
- [ ] Node: local is 20, Vercel builds on 24; supabase-js warns on 20 and fails without a native WebSocket in plain scripts (the seats script avoids it by using fetch). Upgrade local Node to 22+.
- [ ] Secret keys on laptops: since 2.2 the admin pages replace the seats and roles scripts for daily use. Once Kim is comfortable with the pages, revoke the per-developer `sb_secret_...` keys and keep one for recovery. The scripts remain as fallbacks.

## From phase 2.3

- [ ] **Point-in-time recovery** is a paid Supabase add-on (Pro plan). Not enabled; the daily backups of the plan apply. Kim decides before launch whether to add it; a restore should be rehearsed once either way.
- [ ] Proofreading 18 September: all 42 public pages in both languages scanned for leftover placeholders and language mix-ups (none); English landing and freelancer pages read in full. Fixed "1 open seats". Left for Kim: the freelancer card "Booking i din egen kalender" promises slot booking that does not exist until phase 4; today clients send a request with proposed times. Reword or keep as a promise.
- [ ] **Remove the test specialist before launch.** "Mette Testesen" (delivered@resend.dev, seat 02 in AI & IT, profile "mette-testesen") is a fictional profile added 17 September so the domain page and a profile could be seen with two people. Delete the person (profile, memberships and rows cascade), set seat 02 back to open with no holder, delete the auth user.
- [ ] Domain copy: the description and typical briefs on every domain page were drafted by Andreas with Claude on 17 September as placeholders. Kim reads them through under Admin → Domæner and edits in place. Note that `pnpm db:push:seed` overwrites all domain copy with `seed.sql`; once Kim has edited, either stop running the seed against the live project or copy his text back into the seed first.

- [x] CV import: the model-based import (Anthropic, then OpenRouter with DeepSeek and Gemini) was replaced on 17 September by a deterministic reader of LinkedIn's own PDF export. `OPENROUTER_API_KEY` is removed from Vercel and no longer needed.
- [ ] Ask the first specialists to bring an English-language LinkedIn export: the reader recognises English and Danish labels, but only a Danish export has been run through it.
- [ ] Upload a real portrait through Min side in a browser once (the storage policies are verified through the API; the file input itself was not driven).
- [ ] Retention: declined applications after six months, declined and stale access requests after ninety days, departed specialists' full profiles after notice plus grace. A pg_cron job, later.

## From phase 2.1

- [x] Supabase advisors run on 18 September with Supabase's own lint set through `supabase db query --linked --file splinter.sql` (the MCP points at a personal project). Fixes in `20260918200000_advisor_fixes.sql`; the remaining findings are accepted and listed in [architecture/data-model.md](../architecture/data-model.md). Rerun after schema changes the same way.
- [x] Kim holds `board` (granted 16 September); he signs in with a magic link whenever he likes.
- [x] Magic-link mail goes through Resend since 17 September (custom SMTP pushed from `config.toml`). The first version of the template failed to render; see the runbook for the rule.
- [ ] Vercel preview URLs of the form `trustusconsult-<hash>-trust-us-consult.vercel.app` are in the auth redirect list as a wildcard; confirm a magic link requested from a preview lands back on that preview.

## Blocked on Kim / Andreas (decisions from the go-live plan)

1. **Email provider: Resend, decided 16 September.** The code is in (`src/lib/email/`, intake confirmations and notices). Account created 17 September, domain verified (EU region), key in `.env.local`; the contact form delivered both mails from `huset@trustusconsult.dk`, and `kontakt@` accepts mail. Key and From are in Vercel (Production and Preview) and Supabase Auth sends through Resend's SMTP with a limit of 60 mails per hour; the first magic link from `/da/log-ind` went out from `huset@trustusconsult.dk` on 17 September. Left: confirm the `optagelse@` mailbox exists (or set `EMAIL_NOTIFY_APPLICATIONS`). **Hand-over reminder for Andreas: upgrade Resend to Pro, add Kim as owner, then leave the account.** Do not leave first.
2. **Vercel GitHub app** on the TrustUsConsult org → then `vercel git connect` and set Framework Preset to Next.js in the dashboard for tidiness.
3. ~~Who may read full CVs~~ Built as approved clients only (2.4); the board approves each request under Adgang. Opening it to any work email later is a policy change, not a rebuild.
4. ~~Login emails~~ Both board (Kim) and admin (Andreas) accounts exist.
5. **Legal text** for privacy/terms, or a go-ahead for reviewed placeholders.
6. **Seats per domain** (three is seeded) and the buy-in payment route (manual bank transfer at launch is assumed).
