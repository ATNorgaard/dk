# Specialists

From accepted application to a live window. Landed with roadmap slice 2.3 on 17 September 2026.

## The rule that decides what the public sees

A profile is **live** when the specialist has published it **and** they hold a seat with status `active` in their domain. Publishing is the specialist's decision (Min side); the seat is the board's (Pladser, set when the buy-in is paid). The `specialist_teasers` view applies the rule; everything public reads that view. A published profile with a reserved seat is invisible, and Min side says so.

## Inviting a specialist (board or admin)

Ansøgninger → open the application → **Invitér som specialist**. One click does, in order: the person (from the application's name and email), the auth account (no mail from Supabase), the `specialist` role in the application's domain, the first open seat in that domain set to `reserved` with them as holder, an empty profile with a slug from their name, the application set to `accepted`, and the welcome mail through Resend (bilingual, tells them to sign in at `/log-ind`). It is safe to click twice: existing pieces are reused, and a seat is only reserved if they hold none in the domain. It stops with a message if the application has no domain or the domain has no open seat.

Then, when the buy-in is registered: Pladser → the seat → status `Aktiv`, date paid → Gem. The window lights up with them within a minute.

## Min side (the specialist)

`/[lang]/portal/min-side`, visible in the portal nav for anyone with the `specialist` role. Sections, in order: LinkedIn import first (so a new specialist starts by importing, then corrects the fields it filled), then one form with one save (`ProfileEditor`, sticky "Gem ændringer" bar, Ctrl+S): basics (title, one-line tagline, city, years), about (summary, skills one per line, languages as two-letter codes), availability and rate (rate is only ever shown to clients), links (LinkedIn, website, the slug in the address), experience, education and certifications as rows added and removed locally until saved. Outside the form: portrait (uploaded straight from the browser into the `portraits` bucket, under the person's own folder) and publishing. `saveProfile` writes every profile column and replaces the three CV lists with what was posted; rows missing the name that identifies them are dropped, and leaving the page with unsaved edits asks first. Every text field is Danish and English; an empty English field falls back to the Danish. The status line says draft / published but seat not active / live, and a rough completeness percentage.

**LinkedIn import.** The specialist saves their LinkedIn profile as a PDF (on the profile: More → Save to PDF; the section links LinkedIn's own guide, https://www.linkedin.com/help/linkedin/answer/a541960) and uploads it in the first section of Min side. `/api/linkedin-import` checks the PDF's metadata (LinkedIn is the author), reads the text runs with their positions through `unpdf`, and `src/lib/linkedin.ts` turns them into fields by layout rules, not by guessing: the export is a fixed Apache FOP template where the sidebar sits left of x = 150 and every element has its own font size (name 26 pt, section headings 15.8 pt, company and institution 12 pt, role title 11.5 pt, dates and body 10.5 pt); a wrapped line continues within 1.4 × the font size, a larger gap starts a new entry; after a role's date line, a line within 1.5 × the size is the location. Section labels are recognised in Danish and English. What comes in: name, headline (→ one-liner), city (first part of the location), summary, top skills, languages (names mapped to ISO codes; unknown names dropped), certifications, experience (organisation, title, dates as YYYY-MM-01, location, description; "Present" and Danish equivalents mean ongoing), education (institution, degree, years), LinkedIn address and a personal website when the contact block has one. The title field gets the most recent role's title. Not in the PDF and so left to the specialist: availability and rate, years in the craft, website when absent, portrait. The editor fills only empty fields and appends rows that are not already present (same organisation and title, institution and degree, or certification name), then marks the form unsaved; nothing is written until "Gem ændringer". A file LinkedIn did not make is refused with a message pointing at the guide.

History: the first version (17 September, same day) sent the CV through a language model (Anthropic, then OpenRouter with DeepSeek V4.1 Flash and Gemini 3.1 Flash-Lite, structured output, Zod-validated). It worked, but the output varied by model and run, translations were invented, and every import needed reading against the source. Andreas replaced it with the deterministic reader the same afternoon; the OpenRouter key was removed from Vercel and `.env.example`. If the model route is ever wanted again, the commit history of `src/app/api/cv-import/route.ts` up to that day has it.

## Public pages

- `/[lang]/specialister/<slug>`: teaser for everyone (name, title, tagline, city, years, availability, skills, portrait); full CV (about, experience, education, certifications, languages, rate, contact) for signed-in clients, board, admin and the owner. Others see the client gate with sign-in and write-to-the-house buttons. The page renders per request (`dynamic = "force-dynamic"`): it reads the session to decide what to show, and a static route that reads cookies fails in production with DYNAMIC_SERVER_USAGE (found 17 September on the first live profile; dev had hidden it). The teaser itself comes from the public view, so an anonymous visit costs one cookie-less query.
- Domain page: cards for the domain's live specialists in seat order; the "window is open" copy only when there are none.
- The house, level two: the first live specialist of the window (name, title, tagline, city, years, "Meet …" link, "+ n more" when the domain has several). Without one, the recruiting copy as before.

## How it is built

- Reads: `src/lib/specialists.ts` (`loadTeasers`, `loadTeaserBySlug`, `loadFullProfile`, `isLive`, `completeness`, `availabilityLine`, `slugify`).
- Writes: `src/app/actions/profile.ts` (owner edits, all through RLS) and `inviteSpecialist` in `src/app/actions/admin.ts`.
- Pages and components: `src/app/[lang]/portal/min-side/`, `src/app/[lang]/specialister/[slug]/`, `src/components/profile/{ProfileEditor,LinkedInImport,PortraitUpload}.tsx`, the level-two block in `HouseStage.tsx` (fed by `teasers` from the landing page), `src/app/api/linkedin-import/route.ts`, `src/lib/linkedin.ts`.
- Copy: `src/content/specialists.ts`; welcome mail in `src/lib/email/templates.ts`.
- Storage: bucket `portraits` (public read, 5 MB, images) and `cvs` (private, 10 MB, PDF). Owners write under `<person_id>/…`; board and admin read everything. Portrait URLs are public and `next.config.ts` allows `*.supabase.co` for `next/image`.

## Testing without a real person

Insert an application with a clearly marked name and an address you control, invite it, mint a token for that address (`generate_link`, see [auth.md](auth.md)) and open `/auth/callback/da/portal/min-side?token_hash=…&type=magiclink`. Resend refuses `example.com` addresses, so the welcome mail fails for those (the code path is otherwise exercised); use `delivered@resend.dev` or a real inbox for the mail itself. Clean up afterwards: delete the person (profile, memberships and notes cascade), set the seat back to `open` with no holder, delete the auth user, delete the application.
