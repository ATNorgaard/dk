# App structure (phase 0 + phase 1)

What is built, file by file. For how the house renders see [house-rendering.md](house-rendering.md); for the database see [data-model.md](data-model.md).

## App (Next.js 16, App Router, TypeScript, pnpm, no Tailwind)
- `src/proxy.ts` — language redirect (`/` → `/da` or `/en` from Accept-Language). Next 16 calls middleware "proxy".
- `src/app/[lang]/` — `page.tsx` landing, `freelancere/page.tsx`, `domaener/[slug]/page.tsx`, `not-found.tsx`, `layout.tsx` (root layout lives here; fonts Geist + Geist Mono via `geist`, Instrument Serif italic via next/font). 38 pages prerender; `revalidate = 60`.
- `src/app/api/events/route.ts` — beacon for view events only.
- `src/app/actions/intake.ts` — server actions for the two forms (validation, honeypot, consent timestamp, event record).
- `src/components/house/HouseStage.tsx` — the house. See [house-rendering.md](house-rendering.md).
- `src/components/motion/SiteMotion.tsx` — scroll progress line, `data-scrolled` on root, reveal-on-scroll (`[data-reveal]`, `--i` stagger) with a manual sweep fallback.
- `src/components/ui/primitives.tsx` — Section, SectionHeading, CapabilityList, FactStrip, TwoColumns, Callout, Timeline, Faq, CardGrid/Card, ContactBlock (takes a form as children), MotionBand, Button.
- `src/components/site/` — SiteHeader (logo, nav, language switch, one CTA), SiteFooter (utilities: contact, press, privacy, terms).
- `src/components/forms/` — ApplicationForm, ContactForm (client components on `useActionState`).
- `src/components/analytics/TrackView.tsx` — `track()` helper + `<TrackView>`.
- `src/content/*.ts` — interface copy as `{da, en}` pairs; `src/lib/i18n.ts` helpers; `src/lib/house.ts` loaders; `src/lib/supabase/{public,server,client}.ts`.
- Design tokens `--hds-*` in `src/app/globals.css` (Huset: white ground, limewash for sunken bands and tints, charcoal, brick blue, gold heart, one orange door per surface). **Since 16 September 2026 the page ground (`--hds-bg`) is white, not limewash, and the site no longer follows the OS colour scheme**: the `prefers-color-scheme: dark` media query was removed at Andreas's request after the charcoal theme showed up for dark-mode visitors. The charcoal theme still exists but only switches on with `data-theme="dark"` on the root, which nothing sets today. Do not reintroduce the media query.

## The house component (`vendor/trustus-house/`)
- `src/widget.js`, `src/widget.css`, `src/house.svg`, `src/domains.json`, **`src/house.css`** (the artwork's light rules; the exported SVG lost its `<style>` block, so this file is the only copy). `node build.mjs` → `public/house/trustus-house.js` (2.0 MB, 538 KB gzip). The build strips the C2PA `<metadata>` block and fails if `house.css` lacks `.tuc-light`.
- Public API: `configure({domains, relationships, copy})`, `select(id)`, `preview(id)`, `reset()`, events `trustus:preview`, `trustus:select` (cancelable), `trustus:ready`. Window ids: `mentor salg bestyrelse invest consulting ai hr advisory supply disruption digital projekt management juridisk automation`.
