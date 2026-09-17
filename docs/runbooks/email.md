# Email

How the house sends mail, what has to be configured once, and how to swap the provider. Written 16 September 2026.

## In the code

- One function, `sendEmail(mail)` in `src/lib/email/index.ts`, with a provider interface behind it. Resend is the first provider, talked to over its HTTP API with `fetch` (no SDK). When `RESEND_API_KEY` is missing the "log" provider prints the mail to the server log and sends nothing, so local development and previews without the key keep working.
- The mails themselves are in `src/lib/email/templates.ts`: bilingual functions that return subject, HTML and text. Today: application received (to the applicant), contact received (to the client), and two internal notices to the house.
- Sending is best effort. A form never fails because a mail did not go out; the row is already in the database, and the failure is in the log.
- Callers so far: the two intake actions in `src/app/actions/intake.ts`. The flows in roadmap 2.3 to 2.5 (invitations, access approval, booking requests) add templates here.
- Supabase Auth mails (magic links) do not go through this code. They go through Supabase's own sender until custom SMTP is switched on (below).

## Switching provider later

Add a second object implementing `EmailProvider` in `index.ts` and change `pickProvider()`. Templates and callers stay as they are. Environment variables are the only other place a provider name appears.

## One-time setup (Andreas, with Kim's accounts)

1. **Resend account.** Created by Andreas on 17 September 2026 with the domain added in the EU region. The free plan allows one team member, so **before Andreas leaves the account: upgrade to Pro, invite Kim (kah@trustusconsult.dk) as owner, let him accept, then remove Andreas.** Domains and API keys belong to the team and survive the hand-over. Leaving as the only owner deletes the account and breaks every mail.
2. **Add the domain** `trustusconsult.dk` in Resend and put the DNS records it shows into the registrar: DKIM (TXT or CNAME), SPF (`include:amazonses.com` on a Resend-specific subdomain, as Resend instructs), and a DMARC record if none exists (`v=DMARC1; p=none; rua=mailto:...` to start). Wait for "Verified". If the sending mailbox should also *receive* replies, the MX for `trustusconsult.dk` stays with the existing mail host; Resend only needs its own records.
3. **Mailboxes.** The forms reply to and notify `kontakt@` and `optagelse@trustusconsult.dk` (`src/content/site.ts`). Those addresses must exist at the mail host, or set `EMAIL_NOTIFY_APPLICATIONS` and `EMAIL_NOTIFY_CONTACT` to addresses that do.
4. **API key** in Resend: sending access only, restricted to the domain. It goes into `.env.local` as `RESEND_API_KEY` and into Vercel project settings for Production and Preview. Never into chat, commits or `NEXT_PUBLIC_*`.
5. **From address:** `EMAIL_FROM="TrustUsConsult <huset@trustusconsult.dk>"` in the same places. Any local part on the verified domain works; `huset@` need not be a mailbox unless replies should land there.
6. **Test** from a preview: send the contact form, watch the Resend dashboard for the two mails, open one.
7. **Auth mails through Resend.** Done 17 September the repo way: the `[auth.email.smtp]` block in `config.toml` is live and `auth.rate_limit.email_sent` is 60 per hour. Because the block is declared, every `supabase config push` needs the key in the shell, otherwise it pushes an empty password:

```powershell
$env:RESEND_API_KEY = (Get-Content .env.local | Select-String '^RESEND_API_KEY=' | ForEach-Object { $_.Line.Split('=',2)[1] }); npx supabase config diff
```

   The diff must show only the smtp properties. Then `npx supabase config push`. Request a magic link at `/da/log-ind`; it now arrives from `huset@trustusconsult.dk` and the hourly cap is gone.

## Traps

- Resend's HTTP API and SMTP relay use the same API key. Rotating the key means updating Vercel, `.env.local` and the Supabase SMTP password.
- `supabase config push` writes every declared property, and the smtp block is declared. Always export `RESEND_API_KEY` in the shell before a push (the command above), otherwise the push sends an empty password and breaks magic links. `supabase config diff` shows `auth.email.smtp.pass` as masked, so check the export, not the diff.
- A mail to a mailbox that does not exist bounces silently from the sender's point of view. Check the Resend dashboard for bounces after the first day.
