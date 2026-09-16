# Open items

## From phase 1 (not blocked on Kim)

- [ ] Privacy and terms pages at `/[lang]/privatliv` and `/[lang]/vilkaar` — the forms link to them. Draft Danish text marked "til gennemsyn af juridisk domæne".
- [ ] Canonical names for domains 04 (`Investering & Projekt` vs `Investment & Finance`) and 10 (`Disruption & Innovation` vs `Innovation & New Ventures`) once Kim decides; one-line change in `seed.sql`, re-run `pnpm db:push:seed`.
- [ ] Keyboard focus ring on the lamp overlay was implemented (`data-focus` mirror in HouseStage) but could not be verified in a hidden pane; tab through windows in a real browser.
- [ ] `daily_domain_metrics` and `domain_staffing` are security-definer views (fine: counts only) — confirm the Supabase security advisor is happy once MCP points at the right project.
- [ ] Node: local is 20, Vercel builds on 24; supabase-js warns on 20. Upgrade local Node to 22+.

## Blocked on Kim / Andreas (decisions from the go-live plan)

1. **Email provider** (Resend recommended), sending domain verified under Kim's account, API key into Vercel env + `.env.local` as `RESEND_API_KEY` (never in chat/commits).
2. **Vercel GitHub app** on the TrustUsConsult org → then `vercel git connect` and set Framework Preset to Next.js in the dashboard for tidiness.
3. **Who may read full CVs:** approved clients only (recommended) or any signed-up work email.
4. **Login emails** for the first board (Kim) and admin (Andreas) accounts.
5. **Legal text** for privacy/terms, or a go-ahead for reviewed placeholders.
6. **Seats per domain** (three is seeded) and the buy-in payment route (manual bank transfer at launch is assumed).
