# Booking requests

A first meeting between a visitor and a specialist, from request to calendar invitation. Landed with roadmap slice 2.5 on 17 September 2026.

## The flow

1. **Request.** On every live specialist page, "Book et møde": duration (20 or 45 minutes) and up to three proposed times, then name, work email, company and a brief. Anyone may ask; a signed-in client has name and email prefilled. The request is stored with a `client_token`; the requester gets a mail with a link to their page, the specialist a mail with the times, the brief and a link to Min side.
2. **Reply.** The specialist sees the request under "Mødeforespørgsler" on Min side and either accepts one of the proposed times, proposes another, or declines with an optional line. The first of these stamps `first_reply_at`: the collective's response-time KPI, measured from request to first reply.
3. **Agreement.** Accepting (by the specialist, or by the requester on a counter-proposal from their page) sets the status to `accepted` and mails both sides "Aftalt", each with a calendar file (`moede.ics`) attached. A counter-proposal mails the requester a link to accept it. A decline mails the requester and points at `kontakt@` for another specialist. The requester can cancel from their page until the time is agreed; the specialist is told.
4. **The requester's page** `/[lang]/booking/<id>?t=<token>` needs no account. The token in the mail is the credential; the page and its actions read through the service client after checking it. A wrong or missing token shows a plain "not found".

Times are entered in Copenhagen time and stored as instants; the mails and pages show them in Copenhagen time.

## Where the board sees it

- Admin → **Møder** (`/admin/bookinger`): every request, newest first, with status and the time to first reply, plus two numbers: open requests and the median reply time. Read-only; replies come from the specialist.
- The overview counts open requests.

## How it is built

- Tables `booking_requests`, `proposed_times`, `booking_events` (`20260917180000_bookings.sql`). RLS: anyone inserts a request, client-proposed times and the "requested" event; specialists read and update their own and insert their times and events; clients read their own by person; domain leads read their domain; board and admin read all. No anonymous reads: the requester's page uses the service client (`src/lib/supabase/admin.ts`) with the token.
- Reads in `src/lib/bookings.ts`; actions in `src/app/actions/bookings.ts` (`submitBooking`, `acceptTime`, `proposeTime`, `declineBooking`, `clientAcceptProposal`, `clientCancel`).
- UI: `src/components/booking/BookingForm.tsx` (the three-step form, one `<form>` with visible panes so nothing is lost going back), `BookingInbox.tsx` (Min side), `[lang]/booking/[id]/page.tsx`, `[lang]/admin/bookinger/page.tsx`. Copy in `src/content/bookings.ts`.
- Mails in `src/lib/email/templates.ts` (`bookingRequested`, `bookingReceived`, `bookingAccepted` with the attachment, `bookingProposed`, `bookingDeclined`, `bookingCancelled`); the calendar file in `src/lib/email/ics.ts`. `Mail` gained `attachments`, which the Resend adapter base64-encodes.
- The anon role may insert but never read `booking_requests`, so `submitBooking` mints the id and token itself and inserts without asking the row back (PostgREST refuses a returning insert without a select policy).

## Traps

- `datetime-local` inputs must not carry `step`: the browser counts the step from `min`, so a round hour becomes "invalid". Found in testing and removed.
- Resend's API does not report attachment metadata on sent mails, so the calendar file's presence is verified by the code path, not by reading it back. Check the first real "Aftalt" mail in an inbox once.

## Later

- Real availability: calendar connections and free/busy slots instead of proposed times (phase 4).
- A daily nudge for unanswered requests, so the response-time number stays honest (go-live plan risk list).
- The "domain suggests someone else" path when a specialist declines.

## Daily nudge for unanswered requests

Vercel Cron calls `/api/cron/nudge` every morning at 07:00 UTC (`vercel.json`) with `CRON_SECRET` as bearer token. Every request that is still `requested`, has no `first_reply_at`, is older than 20 hours and has not been nudged in the last 20 hours gets one mail to the specialist (`bookingNudge`, in their language, with the hours waited and a link to Min side) and a `nudged` event with actor `system`. Nothing happens to the request itself; the next morning nudges again if it is still unanswered. Run it by hand with `curl -H "Authorization: Bearer $CRON_SECRET" https://www.trustusconsult.dk/api/cron/nudge`; the answer says how many were checked and sent. Added 18 September 2026.
