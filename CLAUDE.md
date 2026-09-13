# TrustUsConsult · Huset

Web app for TrustUsConsult: public site, specialist directory and portal. Next.js (App Router, TypeScript) on Vercel, Postgres/Auth/Storage on Supabase. Owned by TrustUsConsult (Kim Herløv); built by Andreas Nørgaard and team.

## Stack and accounts
- **Supabase project:** `fghgbjfvdtuhxfmqgzgo` ("TUC", eu-central-1 Frankfurt), organisation owned by TrustUsConsult. The CLI is linked to it (`supabase/.temp`). If a Supabase MCP server is attached to this session, check `get_project_url` first: it may point at a different, personal project. Never apply migrations through MCP unless the URL matches.
- **Vercel:** team `trust-us-consult`, project `trustusconsult-dk` (`.vercel/project.json`). Git repo: `github.com/TrustUsConsult/dk`.
- **Package manager:** pnpm. Node 20.

## Commands
- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm typecheck`
- `pnpm db:push` applies `supabase/migrations/*` to the linked project. `pnpm db:push:seed` also runs `supabase/seed.sql` (idempotent upserts).
- `pnpm db:diff` shows drift between migrations and the linked database.
- `pnpm db:types` regenerates `src/lib/supabase/database.types.ts`.
- `pnpm house:build` rebuilds the house web component from `vendor/trustus-house/src` into `public/house/trustus-house.js`. Never edit the built bundle by hand; edit `src/` and rebuild. The build strips the C2PA `<metadata>` block from `house.svg`.
- Reference designs (the three Claude Design screens and the original Huset theme) are in `design/reference/`. They are documentation, not served.

## Conventions
- **Schema changes are migration files only.** Never edit the database from the dashboard without a matching migration. Migration names: `YYYYMMDDHHMMSS_topic.sql`.
- **Bilingual copy** is stored as jsonb `{"da": "...", "en": "..."}` using the `i18n_text` domain. Danish is the default language. Interface strings live in code; content Kim edits lives in the database.
- **Domain IDs are fixed** (`mentor, salg, bestyrelse, invest, consulting, ai, hr, advisory, supply, disruption, digital, projekt, management, juridisk, automation`). They match the window IDs in the house artwork and must never change. Names and slugs may.
- **Row-level security on every table.** Public data is exposed through explicit `select` policies or views; anything about people is private by default. Run the Supabase security advisors after schema changes.
- **Design tokens** live in `src/app/globals.css` as `--hds-*` (Huset design system). No Tailwind. Style with CSS modules and tokens; never hardcode brand colours in components.
  - One orange `entry` action per surface. Gold means people and values, at most once per surface. Gold and orange carry dark type.
- **Supabase clients:** `lib/supabase/public.ts` for cookie-less public reads on static pages, `lib/supabase/server.ts` for per-request user sessions, `lib/supabase/client.ts` in client components.
- **No personal data in seeds or fixtures.** Illustrative people from the design prototype are not to be imported.
- Secrets only in `.env.local` (ignored) and Vercel env vars. `.env.example` lists every key.

## Where the design lives
Claude Design project "Freelance Portal Map Interface" holds the three reference screens (Landing v2, Freelancere, Portal), the house component source and the brand theme. The go-live plan and phase roadmap are in the team's Claude artifacts.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
