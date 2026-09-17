# Specialists

From accepted application to a live window. Landed with roadmap slice 2.3 on 17 September 2026.

## The rule that decides what the public sees

A profile is **live** when the specialist has published it **and** they hold a seat with status `active` in their domain. Publishing is the specialist's decision (Min side); the seat is the board's (Pladser, set when the buy-in is paid). The `specialist_teasers` view applies the rule; everything public reads that view. A published profile with a reserved seat is invisible, and Min side says so.

## Inviting a specialist (board or admin)

Ansøgninger → open the application → **Invitér som specialist**. One click does, in order: the person (from the application's name and email), the auth account (no mail from Supabase), the `specialist` role in the application's domain, the first open seat in that domain set to `reserved` with them as holder, an empty profile with a slug from their name, the application set to `accepted`, and the welcome mail through Resend (bilingual, tells them to sign in at `/log-ind`). It is safe to click twice: existing pieces are reused, and a seat is only reserved if they hold none in the domain. It stops with a message if the application has no domain or the domain has no open seat.

Then, when the buy-in is registered: Pladser → the seat → status `Aktiv`, date paid → Gem. The window lights up with them within a minute.

## Min side (the specialist)

`/[lang]/portal/min-side`, visible in the portal nav for anyone with the `specialist` role. Sections: basics (title, one-line tagline, city, years), portrait (uploaded straight from the browser into the `portraits` bucket, under the person's own folder), about (summary, skills one per line, languages as two-letter codes), availability and rate (rate is only ever shown to clients), links (LinkedIn, website, the slug in the address), experience, education, certifications, CV import, publishing. Every text field is Danish and English; an empty English field falls back to the Danish. The status line says draft / published but seat not active / live, and a rough completeness percentage.

**CV import.** Upload a PDF or paste LinkedIn text; `/api/cv-import` sends it through OpenRouter (OpenAI-style chat completions, plain `fetch`, no SDK) with a structured output schema in the profile's shape and returns a proposal, validated with Zod before it reaches the browser. The specialist reads it and clicks "Brug forslaget"; `applyImport` fills only empty fields and appends CV rows, never overwriting. Needs `OPENROUTER_API_KEY` on the server (Vercel and `.env.local`); without it the section says it is not enabled. The model is `OPENROUTER_MODEL`, default `anthropic/claude-opus-5`; any OpenRouter id with structured outputs and file input works, so switching provider is one env var. A CV is a few thousand tokens, so cost per import is cents. PDFs go to the model as a file part with OpenRouter's native PDF engine.

## Public pages

- `/[lang]/specialister/<slug>`: teaser for everyone (name, title, tagline, city, years, availability, skills, portrait); full CV (about, experience, education, certifications, languages, rate, contact) for signed-in clients, board, admin and the owner. Others see the client gate with sign-in and write-to-the-house buttons. The page is static for anonymous visitors and rendered per request when a session cookie is present.
- Domain page: cards for the domain's live specialists in seat order; the "window is open" copy only when there are none.
- The house, level two: the first live specialist of the window (name, title, tagline, city, years, "Meet …" link, "+ n more" when the domain has several). Without one, the recruiting copy as before.

## How it is built

- Reads: `src/lib/specialists.ts` (`loadTeasers`, `loadTeaserBySlug`, `loadFullProfile`, `isLive`, `completeness`, `availabilityLine`, `slugify`).
- Writes: `src/app/actions/profile.ts` (owner edits, all through RLS) and `inviteSpecialist` in `src/app/actions/admin.ts`.
- Pages and components: `src/app/[lang]/portal/min-side/`, `src/app/[lang]/specialister/[slug]/`, `src/components/profile/{PortraitUpload,CvImport}.tsx`, the level-two block in `HouseStage.tsx` (fed by `teasers` from the landing page), `src/app/api/cv-import/route.ts`.
- Copy: `src/content/specialists.ts`; welcome mail in `src/lib/email/templates.ts`.
- Storage: bucket `portraits` (public read, 5 MB, images) and `cvs` (private, 10 MB, PDF). Owners write under `<person_id>/…`; board and admin read everything. Portrait URLs are public and `next.config.ts` allows `*.supabase.co` for `next/image`.

## Testing without a real person

Insert an application with a clearly marked name and an address you control, invite it, mint a token for that address (`generate_link`, see [auth.md](auth.md)) and open `/auth/callback/da/portal/min-side?token_hash=…&type=magiclink`. Resend refuses `example.com` addresses, so the welcome mail fails for those (the code path is otherwise exercised); use `delivered@resend.dev` or a real inbox for the mail itself. Clean up afterwards: delete the person (profile, memberships and notes cascade), set the seat back to `open` with no holder, delete the auth user, delete the application.
