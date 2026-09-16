# Managing seats as an admin

Setup for each admin.

Seats per domain are edited with the `domain-seats` skill in `.claude/skills/domain-seats/`, which ships with the repo: pull `main` and Claude Code picks it up. It drives one dependency-free script that you can also run directly:

```bash
node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs list
```

- Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. That is enough to read counts.
- Writes (`add`, `set`, `remove`, `target`, `override`) need `SUPABASE_SECRET_KEY` in `.env.local`. Get it yourself from the Supabase dashboard (project TUC → Project settings → API keys → secret). It is the service role: it bypasses row-level security on every table, so only admins who may see everything get it, and it never goes into chat, commits, docs or Vercel `NEXT_PUBLIC_*` vars.
- The script refuses any project other than `fghgbjfvdtuhxfmqgzgo` and prints the domain's staffing after each write. Public pages follow within a minute.
- The Supabase MCP in a Claude session may point at someone's personal project; the skill's SKILL.md says how to check before using it. Do not use it for seats without that check.
- This is a stopgap until the phase 2 admin page ([roadmap 2.2](../status/roadmap.md)) gives Kim and the board a seats editor under their own roles.
