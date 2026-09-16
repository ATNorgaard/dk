---
name: domain-seats
description: Read and write the seats (seatings, pladser) of each domain in the TrustUsConsult house on Supabase, as an admin. Use this whenever someone wants to see, add, open, reserve, activate, close or remove seats for a domain (ai, salg, bestyrelse, mentor, hr, ...), change how many seats a domain should have, or force a domain's status on the house map. Also use it when the request mentions staffing, "who sits in", window occupancy, target seats, or a domain that should stop showing "needs" on the house, even if the word "seat" is not used.
---

# Domain seats

The house has fifteen domains; each domain owns a small number of **seats**. A seat is one
row in `public.seats` with a `position` (1..12) and a `status`. The house map and the
freelancer page never read seat rows directly: they read the `domain_staffing` view, which
counts active and open seats per domain and derives the domain's status (`needs` until
active seats reach `domains.target_seats`, else `healthy`; `domains.status_override`
wins when set). So "add a seating to a domain" means inserting a seat row, and the
public site follows within a minute (`revalidate = 60`).

Everything here is done through one bundled script. Run it from the repo root:

```bash
node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs <command> [args]
```

The script talks to PostgREST with fetch, needs no dependencies, refuses to run against
any project other than TUC (`fghgbjfvdtuhxfmqgzgo`), and prints the affected domain's
staffing after every write so you can show the result instead of claiming it.

## Workflow

1. **Read first.** `list` (all domains) or `list <domain>` shows target, active and open
   counts and the derived status. With a secret key it also shows the seat rows with
   positions, holders and dates. Look before writing: positions are unique per domain,
   and a "full" domain at 12 seats cannot take more.
2. **Map the request to a command** (table below). Domain ids are fixed and match the
   house windows; if the user names a domain by its Danish or English name, translate
   it to the id (`Bestyrelse` → `bestyrelse`, `AI & IT` → `ai`, `Salg & Marketing` → `salg`,
   `Juridisk Rådgiver` → `juridisk`, and so on; the full list is in `references/schema.md`).
3. **Write.** Writes need `SUPABASE_SECRET_KEY` in `.env.local`. If it is missing the
   script says so and exits before touching anything. Tell the user where the key lives
   (Supabase dashboard → Project settings → API keys → secret) and that it must never be
   committed or pasted into chat; the user adds it themselves.
4. **Report** the staffing table the script printed. If the change should be visible on
   the site, mention that pages revalidate within a minute.

## Commands

| Intent | Command |
| --- | --- |
| See staffing for all domains or one | `list [domain]` |
| Add one or more seats (default status `open`) | `add <domain> [--count N] [--status s] [--note-da ".." --note-en ".."]` |
| Change a seat: status, holder, dates, note | `set <domain> <position> --status s [--holder uuid\|none] [--paid iso] [--notice iso] [--ends yyyy-mm-dd] [--note-da ..] [--note-en ..]` |
| Delete a seat row | `remove <domain> <position>` (only `open` or `closed` seats without a holder) |
| Change how many seats a domain should have | `target <domain> <0..12>` |
| Force the map status, or clear the override | `override <domain> <healthy\|needs\|full\|none>` |

Seat statuses and what they mean on the site:

- `open`: recruiting. Counts toward `open_seats`; the window shows "seat available".
- `reserved`: an accepted applicant, not yet paid or signed in. Not counted either way.
- `active`: a specialist sits here. Counts toward `active_seats` and turns the domain
  `healthy` once the target is reached.
- `notice`: holder has given notice (`notice_given_at`, `ends_at`). Still not "open".
- `closed`: retired seat. Kept for history; `remove` only if it truly never held anyone.

`add` picks the lowest free positions automatically, so you never need to compute them.
The two-language note is optional; if only one language is given the script copies it to
the other so the `i18n_text` check passes.

## Examples

**"Give AI & IT two more seats."**

```bash
node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs add ai --count 2
```

**"Seat 1 in bestyrelse is now taken, they paid on the 12th."**

```bash
node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs set bestyrelse 1 --status active --paid 2026-09-12T00:00:00Z
```

**"HR should only need two people to count as staffed."**

```bash
node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs target hr 2
```

**"Mark juridisk as full on the map for now."**

```bash
node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs override juridisk full
```

## Things to watch

- **Wrong project.** The Supabase MCP attached to a session may point at a personal
  project, not TUC. The script checks `NEXT_PUBLIC_SUPABASE_URL` and refuses otherwise.
  If you fall back to `mcp__supabase__execute_sql`, call `get_project_url` first and only
  proceed when it contains `fghgbjfvdtuhxfmqgzgo`. Never run `apply_migration` for seat
  changes; seats are data, not schema.
- **Bulk changes.** For "every domain gets a fourth seat" loop the script over the
  fifteen ids in the shell, or run one SQL statement through the guarded MCP path
  (`references/schema.md` has the seed pattern). Either way, `list` afterwards.
- **Holders.** `holder_person_id` is a bare uuid today; the people tables land in
  phase 2. Do not invent uuids. Leave the holder empty and put the name in the note only if
  the admin asks, and remember notes are internal but the table is not encrypted.
- **Schema changes are not this skill.** A new column or status is a migration under
  `supabase/migrations/`, per CLAUDE.md.

For column definitions, the view's SQL and the fixed domain id list, read
`references/schema.md`.
