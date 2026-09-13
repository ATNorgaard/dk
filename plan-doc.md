# TrustUsConsult · Huset — handover and plan

Written 14 September 2026 at the end of phase 1. Read this first, then `CLAUDE.md` for conventions. Everything below is verified against the live database and the deployed preview unless marked otherwise.

## 1. What this is

TrustUsConsult ("Huset") is a collective of independent specialists organised as fifteen **domains**, drawn as the windows of a Christianshavn townhouse. Clients look into a window, meet the specialist, book a twenty-minute meeting. Specialists buy a **seat** in a domain (DKK 12,000 once, 6 % of brokered work, one month notice, eight years in the craft, three-week admission).

- **Owner / product:** Kim Herløv (board). **Builder:** Andreas Nørgaard (admin). Developers HC and Rasmus may join.
- **Go-live plan (the master plan):** Claude artifact "TrustUsConsult Go-Live Plan" — https://claude.ai/code/artifact/3616ae97-ac42-4d5a-abb7-0426b0ae276b. Phases, roles, data model, decisions. This file is the delta since then.
- **Design source:** Claude Design project "Freelance Portal Map Interface" (id `b105ef17-b98b-42a5-9682-4480f7a366dd`). A full export with the 1.9 MB house SVG is at `C:\Coding\# Freelance Portal Map Interface` on Andreas's machine. The three reference screens are committed in `design/reference/`.

## 2. Accounts and infrastructure

| Thing | Where | Notes |
|---|---|---|
| Code | github.com/TrustUsConsult/dk | `main` is the integration branch. Work in `phase-N-*` branches, PR to main. |
| Supabase | project `fghgbjfvdtuhxfmqgzgo` ("TUC"), org owned by TrustUsConsult, region eu-central-1 Frankfurt | CLI is linked (`supabase/.temp`). `pnpm db:push` applies migrations. |
| Vercel | team `trust-us-consult`, project `trustusconsult-dk` | `vercel.json` pins framework `nextjs` and region `fra1`. Env vars set for prod/preview/dev. Deploys are done from the CLI: `vercel deploy --scope trust-us-consult --yes`. Deployment protection is on (team login). |
| Domain | trustusconsult.dk, in Kim's registrar | Not yet pointed at Vercel. |
| Email | none yet | Kim is deciding (Resend recommended). Forms save to the DB; nobody is notified. |

**Traps for agents**
- A Supabase MCP server in Andreas's sessions points at his *personal* project `etpxfpgtxbjhfakgutwc`. Always check `get_project_url` before using MCP; prefer the linked CLI.
- The Vercel MCP has no access to the team. Use the Vercel CLI.
- The GitHub app for Vercel is **not** installed on the TrustUsConsult org, so pushes do not deploy. `vercel git connect` fails until Kim installs it.
- Do not run `pnpm build` while `pnpm dev` is running; it corrupts the dev server's `.next`. Stop dev first.
- A hidden Claude browser pane freezes CSS transitions, `requestAnimationFrame` and IntersectionObserver, and does not move focus. Verify *state* (classes, attributes, DOM) there; verify *animation* in a visible browser.

## 3. What is built (phase 0 + phase 1)

### Database (`supabase/migrations/`)
- `20260913200000_house.sql` — `domains` (fixed ids = house window ids, bilingual jsonb copy, `target_seats`), `domain_relationships` (neighbour pairs, `a < b`), `seats` (status open/reserved/active/notice/closed), view `domain_staffing` (derived status: `needs` until active seats reach target). Public read on published domains and relationships; seats exposed only as counts through the view.
- `20260914090000_intake.sql` — `applications` (specialists), `contact_messages` (clients), `events` (first-party analytics), view `daily_domain_metrics`. Anon may **insert only**, with checks that internal fields (`status`, `handled_at`, `internal_note`, `decided_at`) arrive at defaults. Nobody can read these yet; that needs the role tables of phase 2.
- `supabase/seed.sql` — fifteen domains with DA/EN copy and three open seats each. Idempotent upserts.

### App (Next.js 16, App Router, TypeScript, pnpm, no Tailwind)
- `src/proxy.ts` — language redirect (`/` → `/da` or `/en` from Accept-Language). Next 16 calls middleware "proxy".
- `src/app/[lang]/` — `page.tsx` landing, `freelancere/page.tsx`, `domaener/[slug]/page.tsx`, `not-found.tsx`, `layout.tsx` (root layout lives here; fonts Geist + Geist Mono via `geist`, Instrument Serif italic via next/font). 38 pages prerender; `revalidate = 60`.
- `src/app/api/events/route.ts` — beacon for view events only.
- `src/app/actions/intake.ts` — server actions for the two forms (validation, honeypot, consent timestamp, event record).
- `src/components/house/HouseStage.tsx` — the house. See §4.
- `src/components/motion/SiteMotion.tsx` — scroll progress line, `data-scrolled` on root, reveal-on-scroll (`[data-reveal]`, `--i` stagger) with a manual sweep fallback.
- `src/components/ui/primitives.tsx` — Section, SectionHeading, CapabilityList, FactStrip, TwoColumns, Callout, Timeline, Faq, CardGrid/Card, ContactBlock (takes a form as children), MotionBand, Button.
- `src/components/site/` — SiteHeader (logo, nav, language switch, one CTA), SiteFooter (utilities: contact, press, privacy, terms).
- `src/components/forms/` — ApplicationForm, ContactForm (client components on `useActionState`).
- `src/components/analytics/TrackView.tsx` — `track()` helper + `<TrackView>`.
- `src/content/*.ts` — interface copy as `{da, en}` pairs; `src/lib/i18n.ts` helpers; `src/lib/house.ts` loaders; `src/lib/supabase/{public,server,client}.ts`.
- Design tokens `--hds-*` in `src/app/globals.css` (Huset: limewash paper, charcoal, brick blue, gold heart, one orange door per surface). Light and dark.

### The house component (`vendor/trustus-house/`)
- `src/widget.js`, `src/widget.css`, `src/house.svg`, `src/domains.json`, **`src/house.css`** (the artwork's light rules; the exported SVG lost its `<style>` block, so this file is the only copy). `node build.mjs` → `public/house/trustus-house.js` (2.0 MB, 538 KB gzip). The build strips the C2PA `<metadata>` block and fails if `house.css` lacks `.tuc-light`.
- Public API: `configure({domains, relationships, copy})`, `select(id)`, `preview(id)`, `reset()`, events `trustus:preview`, `trustus:select` (cancelable), `trustus:ready`. Window ids: `mentor salg bestyrelse invest consulting ai hr advisory supply disruption digital projekt management juridisk automation`.

## 4. How the house rendering works (read before touching HouseStage)

Three camera levels: 0 whole facade, 1 whole facade with one lit window and a five-second tour, 2 zoomed into the window ("inside"). Hover → level 1 and switches windows; click the lit window → level 2; Escape or clicking the stage backs out.

Rendering pipeline, and why each part exists:
1. The web component is created imperatively into `.houseHost` after `customElements.whenDefined` and `el.ready`; React never reconciles its 5,600 nodes. Event subscriptions depend on the `bound` state, not on script load (the element appears a tick later).
2. The camera transform is applied to `.subject`, a wrapper that holds the house **and** two overlays, so they move together. Camera updates run synchronously in the effect (not rAF).
3. The component's own card/rail is hidden; the pane beside the stage carries the copy.
4. **Window visuals are hidden in the house** (`.tuc-window > :not(.tuc-hit) { opacity: 0 }`) but the hit rects stay for hover/click/focus.
5. **Static overlay** `.windows`: an SVG with a clone of every window group (glass, clipped panes, frame, focus ring) plus the clip paths they reference. Never changes on hover.
6. **Lamps** `.lamps`: fifteen tiny `<svg>` elements, one per window, each holding only that window's light rect with its clip path (ids suffixed `-lamp`). Opacity animates on the *element* (`data-state` off/near/active) so the compositor blends it with **zero repaint**.

History, so nobody repeats it: (a) rebuilding the bundle without `house.css` lit every window permanently; (b) fading lights inside the house SVG repainted the whole facade each frame and Chrome showed blurry low-res tiles on hover; (c) moving the lights into one overlay SVG with clipped window clones still repainted that overlay each frame (clipping is slow) → same blur; (d) per-lamp elements fixed it. Do not animate anything inside a large SVG.

## 5. Verification recipes that worked

- Build/type/lint: `pnpm typecheck && pnpm lint && pnpm build` (dev stopped).
- Routes: `curl -sI localhost:3000/` → 307 to `/da`; `/da/domaener/findes-ikke` → 404.
- RLS: with the publishable key, `GET /rest/v1/applications?select=id` returns `[]`; an insert setting `handled_at` returns 401.
- House in the hidden pane: dispatch `new PointerEvent('pointerover', {bubbles:true, composed:true, pointerType:'mouse'})` on `.tuc-hit` inside the shadow root; read `data-state` on `svg[data-domain]` lamps and `section#top[data-level]`.
- Deployment: after `vercel deploy`, `vercel inspect <url> --logs` must show `Detected Next.js version`. "Ready" alone proved nothing once.
- Test rows written to Kim's DB during verification were deleted with the service-role key; keep doing that.

## 6. Open items from phase 1 (not blocked on Kim)

- [ ] Privacy and terms pages at `/[lang]/privatliv` and `/[lang]/vilkaar` — the forms link to them. Draft Danish text marked "til gennemsyn af juridisk domæne".
- [ ] Canonical names for domains 04 (`Investering & Projekt` vs `Investment & Finance`) and 10 (`Disruption & Innovation` vs `Innovation & New Ventures`) once Kim decides; one-line change in `seed.sql`, re-run `pnpm db:push:seed`.
- [ ] Keyboard focus ring on the lamp overlay was implemented (`data-focus` mirror in HouseStage) but could not be verified in a hidden pane; tab through windows in a real browser.
- [ ] `daily_domain_metrics` and `domain_staffing` are security-definer views (fine: counts only) — confirm the Supabase security advisor is happy once MCP points at the right project.
- [ ] Node: local is 20, Vercel builds on 24; supabase-js warns on 20. Upgrade local Node to 22+.

## 7. Blocked on Kim / Andreas (decisions from the go-live plan)

1. **Email provider** (Resend recommended), sending domain verified under Kim's account, API key into Vercel env + `.env.local` as `RESEND_API_KEY` (never in chat/commits).
2. **Vercel GitHub app** on the TrustUsConsult org → then `vercel git connect` and set Framework Preset to Next.js in the dashboard for tidiness.
3. **Who may read full CVs:** approved clients only (recommended) or any signed-up work email.
4. **Login emails** for the first board (Kim) and admin (Andreas) accounts.
5. **Legal text** for privacy/terms, or a go-ahead for reviewed placeholders.
6. **Seats per domain** (three is seeded) and the buy-in payment route (manual bank transfer at launch is assumed).

## 8. Phase 2 plan — slices in order

Each slice ends in something Kim can click on a preview. Keep RLS-first: every new table gets policies in the same migration.

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

## 9. Working agreements

- Commit messages: imperative subject, body explains *why*, end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Never seed or fixture real people. Illustrative profiles from the design are not to be imported.
- Bilingual everything; Danish is default and the fallback.
- One orange entry action per surface; gold only for people and values.
- Before handing a preview to Kim: build log shows Next.js detected, `/` redirects, one hover on the house in a visible browser.
