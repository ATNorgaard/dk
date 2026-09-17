# The admin pages

What the board and admin can do at `/[lang]/admin`, and how it is built. Landed with roadmap slice 2.2 on 17 September 2026. Sign in first: [auth.md](auth.md).

## Pages

| Page | Who | What |
|---|---|---|
| Oversigt `/admin` | board, admin | Counts: new applications, unanswered enquiries, domains recruiting, people with access. Each links on. |
| Ansøgninger `/admin/ansoegninger` | board, admin (domain leads read their own domain's rows) | Queue from the freelancer form, filter by status. Detail page: every field, set status (accepted/declined stamp `decided_at`), internal notes in order. |
| Henvendelser `/admin/henvendelser` | board, admin | Enquiries from the contact block, open or handled. Reply from your own mail (the notice mail replies to the sender); mark handled here, with an internal note. |
| Adgang `/admin/adgang` | board, admin | Requests to read the full CVs, from the gate on a specialist page. Each shows who, company, what they are looking for and which page they came from. **Godkend og giv adgang** creates the person and account, an organisation from the company name (reused by name), the `client` role, marks the request approved with your name, and mails them the sign-in address plus a link back to that specialist. **Afslå** marks it declined and sends a short, polite mail pointing at `kontakt@`. Both ask for confirmation. |
| Møder `/admin/bookinger` | board, admin | Every meeting request, newest first, with status and time to first reply; open count and median reply time on top. Read-only: the specialist replies from Min side. See [bookings.md](bookings.md). |
| Domæner `/admin/domaener` | board, admin | Per domain: name, slug, tagline, window text, blurb, skills (one per line), description (the domain page's long copy; paragraphs separated by a blank line), typical briefs (one per line, shown numbered next to the description), target seats, status override, published. Saving revalidates the landing, the freelancer page and every domain page. |
| Pladser `/admin/pladser` | board, admin | Every seat row per domain: status, holder (by email of a person under Personer), buy-in date, notice date, end date, note. Add seats (positions fill 1 to 12); remove only empty open or closed seats, enforced by row-level security as well as the page. |
| Personer `/admin/personer` | board reads; **admin writes** | People and their roles. Grant creates the person and the auth account (no mail is sent; the person signs in from `/log-ind`), or revives a revoked membership. Revoke sets the membership to `revoked`. |
| Tal `/admin/tal` | board, admin | Last 30 days per domain from `daily_domain_metrics`: views, windows opened, visitors, enquiries, applications. |
| Log `/admin/log` | board, admin | Last 200 rows of `audit_log`: who, table, action, a one-line summary and the changed columns. Empty name means a script with the project key. |

## How it is built

- Reads in `src/lib/admin.ts` through the signed-in user's client, so row-level security decides what comes back; a query error is logged as `admin <what>:` on the server, never hidden behind an empty list.
- Writes are server actions in `src/app/actions/admin.ts`. Each re-checks the role (`requireRole`), writes as the user (so the audit trigger knows who), and revalidates the page it came from. `ActionForm` (`src/components/admin/ActionForm.tsx`) wraps a form around one action and shows "Gemt." or the error.
- Copy in `src/content/admin.ts`, Danish first.
- Database: migration `20260917100000_admin.sql` (`application_notes`, `audit_log` and its trigger on every edited table, board/admin policies, grants) and `20260917110000_audit_actor_fk.sql`.
- The `audit_row` trigger skips updates that change only `updated_at`.

## The scripts are now fallbacks

`pnpm roles` and the `domain-seats` skill still work and still need the project's secret key. Use the pages instead: they write as a named person, the log records it, and no secret key sits on a laptop. Keep the scripts for recovery (for instance if nobody holds `admin`) and for the preview branches, which have no people or roles. Revoking the per-developer secret keys is an open item once Kim has used the pages for a while.

## Recipes

- **Give a client access:** Adgang → read what they are looking for → Godkend. They sign in from the mail and every live specialist page shows them the full CV, rate and contact. To take access away later: Personer → the × on their `client` tag.
- **Accept a specialist:** Ansøgninger → set status Optaget → Pladser → set a seat to Reserveret with the person's email (create them under Personer first with role `specialist` and the domain) → when the buy-in is paid, set the seat Aktiv and the date. The domain leaves "søger" when active seats reach the target. Invitation mail comes with 2.3.
- **Hide a domain from the site:** Domæner → untick "Vist på sitet". The window on the house stays; the pages disappear.
- **Force a domain's badge:** Domæner → "Status på huset" → pick one, or Automatisk to follow the seats.
