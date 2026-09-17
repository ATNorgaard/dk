# Accounts and infrastructure

| Thing | Where | Notes |
|---|---|---|
| Code | github.com/TrustUsConsult/dk | `main` is the integration branch. Work in `phase-N-*` branches, PR to main. |
| Supabase | project `fghgbjfvdtuhxfmqgzgo` ("TUC"), org owned by TrustUsConsult, region eu-central-1 Frankfurt | CLI is linked (`supabase/.temp`). `pnpm db:push` applies migrations. Auth settings we manage (site URL, redirect list, magic-link mail) are declared in `supabase/config.toml` and pushed with `supabase config push` after a `config diff`; see [auth.md](auth.md). |
| Vercel | team `trust-us-consult`, project `trustusconsult-dk` | `vercel.json` pins framework `nextjs` and region `fra1`. Env vars set for prod/preview/dev. Since 16 September the Vercel–Supabase integration is installed: it fills the `SUPABASE_*` and `POSTGRES_*` variables, and pushes deploy through Git (main → production, other branches → preview). Deployment protection is on (team login). |
| Supabase branching | one preview branch per git branch with a PR, created by the integration | The preview deployment's `NEXT_PUBLIC_SUPABASE_URL` points at the **branch** database, not the main project: fresh schema from `supabase/migrations`, seeded from `seed.sql`, no people or roles. Vercel starts building the moment the branch is created, before it has migrated; `pnpm build` therefore runs `scripts/wait-for-db.mjs` first, which on `VERCEL_ENV=preview` polls the branch's API until `domains` answers (grants and seed in place), up to four minutes, then lets `next build` go. Production and local builds skip the wait. If it still times out, the branch itself failed: `npx supabase branches list --experimental` shows status. Sign-in on a preview needs roles granted on that branch (`pnpm roles` against the branch keys from `branches get`). |
| Domain | trustusconsult.dk, in Kim's registrar | Live on Vercel since 16 September 2026: `www.trustusconsult.dk` serves the site, the apex redirects to it. It is also the Supabase auth site URL. |
| Email | Resend, domain `trustusconsult.dk` verified (EU region), account created by Andreas 17 September, to be handed to Kim | App mail from `src/lib/email/`; Supabase Auth uses Resend's SMTP relay (`[auth.email.smtp]` in `config.toml`, password from `RESEND_API_KEY` in the shell at push time). Key and `EMAIL_FROM` in `.env.local` and Vercel. Setup and hand-over in [email.md](email.md). |

**Traps for agents**
- A Supabase MCP server in Andreas's sessions points at his *personal* project `etpxfpgtxbjhfakgutwc`. Always check `get_project_url` before using MCP; prefer the linked CLI.
- The Vercel MCP has no access to the team. Use the Vercel CLI.
- The GitHub app for Vercel is **not** installed on the TrustUsConsult org, so pushes do not deploy. `vercel git connect` fails until Kim installs it.
- Do not run `pnpm build` while `pnpm dev` is running; it corrupts the dev server's `.next`. Stop dev first.
- A hidden Claude browser pane freezes CSS transitions, `requestAnimationFrame` and IntersectionObserver, and does not move focus. Verify *state* (classes, attributes, DOM) there; verify *animation* in a visible browser.
