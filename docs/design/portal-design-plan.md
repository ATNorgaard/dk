# Portal, Admin and Min side: design plan

Written 19 September 2026 for Andreas, before any redesign work. A plan, not an implementation. The public site has had design attention (the house, the landing, the domain pages); the signed-in side was built page by page as each slice landed and looks like it. This document says what is there today, what is wrong with it as a workplace, and a phased plan to fix it without rebuilding.

## 1. What is there today

**Shell.** Every signed-in page uses `PortalShell`: the public site's dark fixed header (wordmark, Portal / Min side / Admin, language, "Log ud"), then a 1100px column, then the public footer. Admin pages add a second row of ten text links (`AdminNav`). The "Ser som" pill sits over the header for admins.

**Portal front (`/portal`).** Greeting, email, roles as tags, and "doors": tiles to Min side, applications, enquiries, admin office, the site. No information beyond the roles.

**Admin (`/admin/…`, ten pages).** Overview: six stat tiles. Applications, access, enquiries: a filter row and a stack of cards with inline forms (notes, decisions). Bookings, people, numbers, log: tables. Domains: a row list, then a long form per domain. Seats: one block per domain with a row of small forms per seat. Everything monochrome, one column, forms inline under each item.

**Min side (`/portal/min-side`).** A status line with a completeness percentage, the meeting inbox, the LinkedIn import, then one long form (basics, about, availability, links, experience, education, certifications) with a sticky save bar, then portrait, then publish. Bilingual fields are shown as DA and EN inputs side by side.

## 2. What is wrong with it

- **It is the brochure's chrome on a workplace.** The 72px dark marketing header, the marketing footer and the wide column suit a landing page; a portal wants a quiet frame, denser content and navigation that shows where you are and what needs you.
- **No sense of state.** Nothing tells the board what is waiting (how many, how old) or the specialist what is missing from their profile. Counts exist on one admin page only.
- **Lists and forms are interleaved.** Every queue item carries its own form, so the page is a wall of inputs. Decisions and reading compete for the same space.
- **No status language.** Received, interview, accepted, declined, open, reserved, active, notice: all rendered as the same grey text. No colour, no icon, no consistent chip.
- **Feedback is local and small.** "Gemt." next to a button, `window.confirm` for removals, no empty states, no loading states.
- **Min side is one long scroll.** Roughly forty inputs in one form; the bilingual side-by-side doubles the width of every row; import, inbox and profile fight for the top.
- **Mobile is untested.** Tables overflow, the header collapses to nothing useful, forms are full-width stacks with no hierarchy.

## 3. Principles

1. Keep the Huset tokens and the rules (`--hds-*`, one orange entry action per surface, gold for people and values). The portal should look like the back of the same house, not a different product.
2. Three layers: **shell** (where am I, what needs me), **page** (title, one primary action, state), **content** (lists, detail, forms).
3. Read first, act second: lists show state at a glance; actions live in a detail view or a side panel, not inline under every row.
4. One status system for the whole portal: a chip component with a fixed palette per state, used everywhere the same word appears.
5. Every list has an empty state that says what happens next; every save gives feedback the eye cannot miss; nothing destructive without a proper confirm.

## 4. The plan, by area

### 4.1 Shell

- **Sidebar on desktop, drawer on mobile.** Wordmark top-left, then sections by role. Specialist: Overblik, Møder, Min side. Board and admin: Overblik, Kø (Ansøgninger, Adgang, Henvendelser, with a count badge each), Møder, Huset (Domæner, Pladser), Personer, Tal, Log. Bottom: language, "Ser som", "Log ud". The current AdminNav row disappears into it.
- **Compact top bar** (48px, paper background, hairline) with the page title on mobile and the user's name; no marketing CTA, no footer beyond a one-line legal strip.
- **Content width** 960px for reading pages, full width for tables.

### 4.2 Page header pattern

Eyebrow (section), H1, one-line intro, and on the right the page's single primary action (orange) plus secondary quiet actions. Under it, status chips or a count strip where relevant ("12 open · oldest 4 days"). Same component on every page.

### 4.3 Dashboards (`/portal` becomes a real front page)

- **Specialist:** a profile card (draft / published / live, completeness as a checklist of the missing pieces, each linking into Min side), open meeting requests with the time since arrival, the next agreed meeting, and two quick actions (edit profile, import from LinkedIn).
- **Board and admin:** the queues as three cards with count and oldest age, the response-time KPI (median, and the requests over 24 hours), a fifteen-domain seat strip (three squares per domain in seat colours), and the last ten audit entries. This is the phase-3 board view in its first form; building it here means phase 3 extends it rather than replacing it.

### 4.4 Queues: applications, access, enquiries

Master–detail. Left: a list with status tabs (Modtaget · Samtale · På hold · Afgjort), search, and rows showing name, domain, age, status chip. Right: the selected item in full with its notes as a timeline and the decision actions in a fixed footer (Invitér, Afslå, Sæt på hold). On mobile the list is the page and the detail opens as its own route. Notes get an author and a time, decisions get a visible trail.

### 4.5 Tables: bookings, people, numbers, log

One `DataTable` treatment: sticky header, hairline rows, right-aligned tabular numbers, hover row, row link to detail, filters as chips above, an empty state, and a card layout under 720px. Numbers page: keep the table, add a small sparkline per domain for views and requests over the period; that is the only chart until phase 3.

### 4.6 Huset: domains and seats

- **Seats** as a map: fifteen rows, three tiles each, coloured by state (open, reserved, active, notice, closed), the holder's initials on the tile. Clicking a tile opens a side panel with the seat form. Target and override sit in the row header.
- **Domains** as a list with the window text preview and a status chip; the editor opens as a full page with a live preview of the house window text on the right.

### 4.7 Min side

- **Split into a left index and sections**: Profil (basics, about), CV (experience, education, certifications), Ledighed og takst, Links, Portræt, Udgivelse. The index shows a check per section from the completeness checklist. The form stays one form with the sticky save bar, so "one save" survives.
- **Bilingual fields as one row with DA / EN tabs** (Danish shown, English one click away) instead of two inputs side by side. Halves the visual weight; English falls back to Danish anyway.
- **Møder moves to its own page** with a timeline per request (requested, replied, agreed) and the actions in a footer, the same component as the board's bookings view.
- **LinkedIn import as a short guided flow** (upload, see what was found, apply) in a panel, not a section at the top of the form.
- **Publish as a visible state machine**: Kladde → Udgivet → Synlig, with the seat condition explained where it is not met.

### 4.8 Feedback and components

A status chip, a toast for saves, a confirm dialog (replacing `window.confirm`), an empty state, a skeleton for tables, a side panel. Six components, all built on the existing tokens and the admin form styles, shared by every page above.

## 5. Phasing

| Phase | Scope | Rough effort |
|---|---|---|
| P1 | Shell (sidebar, top bar), page header, status chip, both dashboards | 4 to 5 days |
| P2 | Queues as master–detail, notes timeline, toast and confirm, empty states | 4 days |
| P3 | Min side index and tabs, Møder page, import flow, publish state | 4 days |
| P4 | Seat map and domain editor, DataTable treatment, numbers sparklines, mobile pass | 3 to 4 days |

P1 and P2 give the board a workplace before launch week; P3 is what the founding specialists meet when they import their profiles; P4 can follow launch.

## 6. Decisions, taken 19 September

- **Sidebar.** Andreas: sidebar.
- **Footer.** The public footer stays under the portal pages.
- **Board front page.** Both: the queues with counts and age on top, and the people waiting behind them (the oldest items by name) right under.
- **Languages on Min side.** Danish first; English on a tab per field.

The questions as they were asked:

- Sidebar or top navigation. The plan assumes a sidebar; it fits ten admin destinations and role badges better than a row of links.
- Whether the portal keeps the public footer. The plan assumes a one-line legal strip.
- Whether the board's front page should lead with numbers (queues and KPI) or with people (who is waiting). The plan leads with queues.
- Danish-first with English on a tab, or keep both languages visible at once on Min side.
