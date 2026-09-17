# App structure (phase 0 + phase 1)

What is built, file by file. For how the house renders see [house-rendering.md](house-rendering.md); for the database see [data-model.md](data-model.md).

## App (Next.js 16, App Router, TypeScript, pnpm, no Tailwind)
- `src/proxy.ts` — language redirect (`/` → `/da` or `/en` from Accept-Language), then session refresh via `src/lib/supabase/proxy.ts` and the signed-in check for `/[lang]/portal/**` and `/[lang]/admin/**`. Next 16 calls middleware "proxy". `/auth/*` is excluded from the matcher.
- `src/app/[lang]/` — `page.tsx` landing, `freelancere/page.tsx`, `domaener/[slug]/page.tsx`, `not-found.tsx`, `layout.tsx` (root layout lives here; fonts Geist + Geist Mono via `geist`, Instrument Serif italic via next/font). 38 pages prerender; `revalidate = 60`.
- Signed-in routes (phase 2.1), rendered per request: `[lang]/log-ind/page.tsx` (magic-link form), `[lang]/portal/page.tsx` (shell: who you are, your roles, what lands next). `src/app/auth/callback/[[...next]]/route.ts` is where the magic link lands. See [runbooks/auth.md](../runbooks/auth.md).
- Specialists (phase 2.3): `[lang]/portal/min-side/page.tsx` (the editor), `[lang]/specialister/[slug]/page.tsx` (public teaser, gated full CV), `src/app/api/cv-import/route.ts` (Claude, structured output), `src/lib/specialists.ts`, `src/app/actions/profile.ts`, `src/components/profile/`, `src/content/specialists.ts`. `HouseStage` takes a `teasers` prop from the landing page for level two. See [runbooks/specialists.md](../runbooks/specialists.md).
- Admin (phase 2.2) under `[lang]/admin/`: `page.tsx` overview, `ansoegninger/` (+ `[id]/`), `henvendelser/`, `domaener/` (+ `[id]/`), `pladser/` (one domain at a time, `?d=`), `personer/`, `tal/`, `log/`. Reads in `src/lib/admin.ts`, writes in `src/app/actions/admin.ts`, chrome in `src/components/admin/` (`AdminFrame`, `AdminNav`, `ActionForm`), copy in `src/content/admin.ts`. See [runbooks/admin.md](../runbooks/admin.md).
- `src/lib/auth.ts` — `getViewer()` (memoised per request: user, person, active memberships, roles), `requireViewer(lang, path)`, `requireRole(lang, path, ...roles)`, `hasRole`.
- `src/app/api/events/route.ts` — beacon for view events only.
- `src/app/actions/intake.ts` — server actions for the two forms (validation, honeypot, consent timestamp, event record). `actions/auth.ts` — `requestMagicLink`, `signOut`.
- `src/components/portal/PortalShell.tsx` — chrome for signed-in pages (portal nav, admin link by role, language switch, sign-out form) with `portal.module.css`. `src/components/forms/LoginForm.tsx`.
- `scripts/roles.mjs` (`pnpm roles`) — grant, revoke and list roles with the service key until the admin editor exists.
- `src/components/house/HouseStage.tsx` — the house. See [house-rendering.md](house-rendering.md).
- `src/components/motion/SiteMotion.tsx` — scroll progress line, `data-scrolled` on root, reveal-on-scroll (`[data-reveal]`, `--i` stagger) with a manual sweep fallback.
- `src/components/ui/primitives.tsx` — Section, SectionHeading, CapabilityList, FactStrip, TwoColumns, Callout, Timeline, Faq, CardGrid/Card, ContactBlock (takes a form as children), MotionBand, Button.
- `src/components/site/` — SiteHeader (logo, nav, language switch, one CTA), SiteFooter (utilities: contact, press, privacy, terms).
- `src/components/forms/` — ApplicationForm, ContactForm (client components on `useActionState`).
- `src/components/analytics/TrackView.tsx` — `track()` helper + `<TrackView>`.
- `src/content/*.ts` — interface copy as `{da, en}` pairs (`auth.ts` holds sign-in, portal and admin copy); `src/lib/i18n.ts` helpers (`safeInternalPath` for return targets); `src/lib/house.ts` loaders; `src/lib/supabase/{public,server,client,proxy}.ts`.
- Design tokens `--hds-*` in `src/app/globals.css` (Huset: white ground, limewash for sunken bands and tints, charcoal, brick blue, gold heart, one orange door per surface). **Since 16 September 2026 the page ground (`--hds-bg`) is white, not limewash, and the site no longer follows the OS colour scheme**: the `prefers-color-scheme: dark` media query was removed at Andreas's request after the charcoal theme showed up for dark-mode visitors. The charcoal theme still exists but only switches on with `data-theme="dark"` on the root, which nothing sets today. Do not reintroduce the media query.

## The house component (`vendor/trustus-house/`)
- `src/widget.js`, `src/widget.css`, `src/house.svg`, `src/domains.json`, **`src/house.css`** (the artwork's light rules; the exported SVG lost its `<style>` block, so this file is the only copy). `node build.mjs` → `public/house/trustus-house.js` (2.0 MB, 538 KB gzip). The build strips the C2PA `<metadata>` block and fails if `house.css` lacks `.tuc-light`.
- Public API: `configure({domains, relationships, copy})`, `select(id)`, `preview(id)`, `reset()`, events `trustus:preview`, `trustus:select` (cancelable), `trustus:ready`. Window ids: `mentor salg bestyrelse invest consulting ai hr advisory supply disruption digital projekt management juridisk automation`.
