# Documentation index

Start here. `CLAUDE.md` at the repo root holds the rules agents load every session; this folder holds everything else, split by purpose so no single file has to carry it all.

- **architecture/** how things work. Changes rarely.
  - [app-structure.md](architecture/app-structure.md) what is built: routes, components, the house bundle.
  - [data-model.md](architecture/data-model.md) tables, views, row-level security.
  - [house-rendering.md](architecture/house-rendering.md) the camera levels, overlays and lamps. Read before touching HouseStage.
- **runbooks/** how to do a thing.
  - [infrastructure.md](runbooks/infrastructure.md) accounts, deploy, traps for agents.
  - [verify.md](runbooks/verify.md) verification recipes that worked.
  - [admin-seats.md](runbooks/admin-seats.md) managing seats per domain as an admin.
- **decisions/** why something is the way it is. One short dated file per decision; never edited, only superseded.
- **status/** what is left. The only files with checkboxes.
  - [open-items.md](status/open-items.md) phase 1 leftovers and what is blocked on Kim.
  - [roadmap.md](status/roadmap.md) phase 2 slices in order.
- Agent runbooks per task live in `.claude/skills/*/SKILL.md`. Human runbooks link to them instead of copying.

## What this is

TrustUsConsult ("Huset") is a collective of independent specialists organised as fifteen **domains**, drawn as the windows of a Christianshavn townhouse. Clients look into a window, meet the specialist, book a twenty-minute meeting. Specialists buy a **seat** in a domain (DKK 12,000 once, 6 % of brokered work, one month notice, eight years in the craft, three-week admission).

- **Owner / product:** Kim Herløv (board). **Builder:** Andreas Nørgaard (admin). Developers HC and Rasmus may join.
- **Go-live plan (the master plan):** Claude artifact "TrustUsConsult Go-Live Plan" — https://claude.ai/code/artifact/3616ae97-ac42-4d5a-abb7-0426b0ae276b. Phases, roles, data model, decisions. This file is the delta since then.
- **Design source:** Claude Design project "Freelance Portal Map Interface" (id `b105ef17-b98b-42a5-9682-4480f7a366dd`). A full export with the 1.9 MB house SVG is at `C:\Coding\# Freelance Portal Map Interface` on Andreas's machine. The three reference screens are committed in `design/reference/`.

Most of this was written 14 September 2026 at the end of phase 1 and verified against the live database and the deployed preview unless marked otherwise.
