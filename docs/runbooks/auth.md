# Sign-in and roles

How people get into the portal, how roles are granted, and how to test it without an inbox. Landed with roadmap slice 2.1 on 16 September 2026.

## How sign-in works

- **Magic link only.** `/[lang]/log-ind` asks for an email and calls Supabase Auth `signInWithOtp` from a server action with `shouldCreateUser: false`. The form never creates accounts: the house does (see roles below), and an unknown address gets the same "check your inbox" answer as a known one, so the form cannot be used to find out who has access.
- **The mail** uses the template in `supabase/templates/magic_link.html` (bilingual, Danish first). Its link carries a `token_hash` to `/auth/callback`, so it works in any browser, not only the one that asked. The callback also accepts the `code` shape Supabase's default template produces, as a fallback.
- **The callback** (`src/app/auth/callback/route.ts`) verifies the token, sets the session cookies and redirects to `next`. `next` must be a path on this site under a language prefix; anything else becomes `/[lang]/portal`. A used or expired link goes back to the login page with `?error=link`.
- **Sessions** are refreshed by `src/proxy.ts` on every page request (`lib/supabase/proxy.ts`). The proxy also keeps signed-out visitors out of `/[lang]/portal/**` and `/[lang]/admin/**`; that is the optimistic check. Pages verify the user against the auth server and read roles through `lib/auth.ts` (`getViewer`, `requireViewer`, `requireRole`). The database checks roles a third time in row-level security via `has_role(...)`.
- **First sign-in** fires the `on_auth_user_created` trigger, which attaches the new auth user to the `people` row with the same email, or creates one if nobody invited them. A person with no memberships sees an empty portal and a hint to write to the house.
- **Sign-out** is a form in the portal header posting to the `signOut` server action.

## Granting roles

Until the admin editor (roadmap 2.2), roles are granted with a script. It needs `SUPABASE_SECRET_KEY` in `.env.local` (the service role; see [admin-seats.md](admin-seats.md) for how keys are handled).

```bash
pnpm roles list
```

```bash
pnpm roles grant kim@example.com board --name "Kim Herløv"
```

```bash
pnpm roles grant someone@example.com specialist --domain ai --lang en
```

```bash
pnpm roles revoke someone@example.com specialist --domain ai
```

`grant` creates the `people` row and the auth account if they are missing (no email is sent), links them, and adds the membership. `specialist` and `domain_lead` need `--domain`; `client`, `board` and `admin` take none. The person then signs in from `/log-ind` whenever they like. The admin page at `/[lang]/admin` lists everyone with their roles.

Roles: `client` (reads full CVs, 2.4), `specialist` (own profile and requests, 2.3), `domain_lead` (reviews applicants in one domain), `board` (Kim: reads everything, decides), `admin` (Andreas: everything, including writes to people and memberships).

## Auth settings on the hosted project

`supabase/config.toml` declares only the auth properties we manage: `site_url`, `additional_redirect_urls` and the magic-link template. Everything else in that file either mirrors the hosted value or is commented out, because `supabase config push` writes every property the file declares and leaves undeclared ones alone. The hosted project has settings nobody set from this repo (email confirmations on, OTP length 8, MFA enabled, a Twilio toggle), so:

1. Change the setting in `config.toml`.
2. Run `npx supabase config diff` and read the JSON. Only the properties you meant to change may appear as `update`; `remote_only` rows are fine.
3. Then `npx supabase config push`.

The redirect allow-list covers production (`www.trustusconsult.dk`, `trustusconsult.dk`), the Vercel aliases and preview URLs, and `localhost:3000`. A new preview host pattern goes in the list before magic links work there.

**Email sender.** Auth mails go out through Supabase's built-in sender until the email provider exists (roadmap 2.6, blocked on Kim). That sender allows only a couple of mails per hour across the whole project (`over_email_send_rate_limit`, shown on the form as "wait a minute") and has a generic from-address. Enough for the board to sign in, not for testing in a loop and not for launch.

**Editing the template.** GoTrue renders it with Go's `html/template`, which escapes by context. An `{{ if }}` whose branches end in different URL contexts inside an `href` (one after a `?`, one before) makes every later `{{ }}` in that attribute "ambiguous" and the send fails with "Error sending magic link email". Keep each branch a whole `<a>` element, as the file does now, and keep `{{ .TokenHash }}` after a literal `?` or `&amp;`.

## Testing sign-in without an inbox

The admin API can mint the same token the mail would carry:

```bash
node --env-file=.env.local -e "const u=process.env.NEXT_PUBLIC_SUPABASE_URL,k=process.env.SUPABASE_SECRET_KEY;fetch(u+'/auth/v1/admin/generate_link',{method:'POST',headers:{apikey:k,Authorization:'Bearer '+k,'Content-Type':'application/json'},body:JSON.stringify({type:'magiclink',email:'you@example.com'})}).then(r=>r.json()).then(j=>console.log(j.hashed_token??j.properties?.hashed_token))"
```

Open `http://localhost:3000/auth/callback?token_hash=<that>&type=magiclink&next=/da/admin` in a browser. The token is single-use and expires after an hour. The account must already exist (`pnpm roles grant` creates it).

What to check after a change to auth: `/da/portal` signed out redirects to `/da/log-ind?next=...`; the callback with no parameters redirects to the login page with `?error=link`; signed in, `/da/admin` shows the people table for board and admin and sends everyone else to `/da/portal?denied=1`; "Log ud" returns to the landing and `/da/admin` redirects again.
