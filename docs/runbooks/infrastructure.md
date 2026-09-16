# Accounts and infrastructure

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
