# TrustUsConsult Go-Live Plan

> Copy of the Claude artifact "TrustUsConsult Go-Live Plan" (https://claude.ai/code/artifact/3616ae97-ac42-4d5a-abb7-0426b0ae276b), copied into the repo on 16 September 2026 so it survives without access to the artifact. The artifact is the original; this file is a faithful text transcription. Status since this plan was written is tracked in [status/roadmap.md](status/roadmap.md) and [status/open-items.md](status/open-items.md).

**From prototype to a house people can actually walk into.**

A go-live plan for the TrustUsConsult web app: what the three Claude Design screens already prove, what has to become real before launch, and how it fits together on Supabase and Vercel. Features and functionality only. No code in this document.

- Date: 11 September 2026
- Status: Draft for discussion
- For: Kim Herløv, Andreas Nørgaard, HC, Rasmus
- Source: Landing v2 · Freelancere · Portal

## Contents

1. [Where the prototype stands](#1-where-the-prototype-stands)
2. [What launch means](#2-what-launch-means)
3. [People and permissions](#3-people-and-permissions)
4. [Feature plan by surface](#4-feature-plan-by-surface)
5. [Data model on Supabase](#5-data-model-on-supabase)
6. [Architecture on Vercel](#6-architecture-on-vercel)
7. [Migrating the prototype](#7-migrating-the-prototype)
8. [Trust, GDPR and legal](#8-trust-gdpr-and-legal)
9. [Phased roadmap](#9-phased-roadmap)
10. [Go-live checklist](#10-go-live-checklist)
11. [Decisions for Kim](#11-decisions-for-kim)
12. [Risks](#12-risks)

## 1. Where the prototype stands

*Inventory.* The three artboards are a complete narrative of the product: a public front door for clients, a recruitment page for specialists, and a portal with a domain map, domain pages, full CVs, a board dashboard and a specialist workspace. The interaction design is far along. Nearly everything behind it is still mocked.

| Surface | What the prototype shows | State | What it means for launch |
|---|---|---|---|
| Landing (kunder) | The house as camera subject with three zoom levels, fifteen domains with taglines, motion band, how-it-works, utilities, anonymised cases, FAQ, contact block. Danish and English. | Design real | Copy and structure carry over. Domain data and the illustrative specialist per window move to the database. |
| The house component | Standalone web component with fifteen fixed window IDs, neighbour lighting from a relationship list, configure() API, select and preview events, reduced-motion support. | Reusable | Keep as-is. Feed it names, descriptions, skills and links from the database instead of hardcoded getters. |
| CV login gate | Email and password modal on the landing. Any well-formed input "logs in" and deep-links to the portal profile. | Fake | Replace with Supabase Auth and a real access-request flow for clients. |
| Freelancere page | What you get, economics (buy-in, six percent share, one month notice), three-week admission timeline, open seats, mailto application. | Design real | Open seats become live data. The mailto becomes a structured application form. |
| Portal: domain map | Constellation of fifteen nodes sized by traffic, dashed for "needs specialists", filters, search across domains and people, side panel with metrics and specialist cards. | Static data | Node size, status and metrics need a real analytics pipeline. Search needs a real index. |
| Portal: domain and profile pages | Domain header with four metrics, specialist grid, "room for one more" seat card. Profile with portrait, contact, skills, certifications, summary, experience timeline, education, languages, rate, availability. | Hardcoded people | This is the profile schema. Fourteen specialists are illustrative and must be removed before launch; one is a real person with a real private email. |
| Portal: booking | Three-step dialog: duration, five weekday dates, five fixed slots, then name, work email, company, brief, then confirmation. | No backend | Becomes a booking request stored in the database with email to the specialist and the client. Real availability comes later. |
| Portal: board view | Total traffic, bookings, average response time, domains below staffing target, per-domain table, weekly bars, "needs action" list. | Computed from fake numbers | The KPI definitions are good. They need event capture from day one so the dashboard has data by the time it ships. |
| Portal: Min side | Utility box (invoicing, bookings, marketing, contracts, time tracking, collective), inbound requests, profile completeness, views and response time. | Placeholder | Bookings and profile editing are launch scope. Invoicing, time tracking and marketing are later phases, most likely integrations rather than builds. |
| Role switching | A header control cycles visitor, freelancer, board. | Prototype device | Roles come from the signed-in user. The switcher disappears. |
| Runtime | Claude Design runtime loads React and Babel from unpkg at page load and compiles templates in the browser. Pages link each other by file name. | Not shippable | Rebuild as a Next.js app. Nothing from the runtime survives; the design tokens and the house component do. |

**Two content inconsistencies to settle early.** Domain names differ between surfaces: the house bundle says "Investment & Finance" and "Innovation & New Ventures", the landing says "Investering & Projekt" and "Disruption & Innovation". And the portal uses an olive-green palette from a different design system while the landing uses Huset's brick blue and charcoal. Both are quick decisions, but every table below assumes one canonical list of fifteen domains and one palette.

## 2. What launch means

*Scope.* In the August meeting Kim framed version one precisely: a person should be able to read a specialist's CV and set up a meeting. Everything else in the prototype is valuable, but it is what the house grows into, not what it needs to open. The plan below splits the product into what must be real on launch day, what ships in the months after, and what should be bought rather than built.

**Launch**

- Public site in Danish and English with the house, domains, cases, FAQ and contact.
- Directory of domains and specialists with public teaser profiles.
- Full CV behind client login, with an access-request flow Kim approves.
- Booking requests to a specialist with email confirmation on both sides.
- Specialist sign-in and a profile editor, including CV import from PDF or LinkedIn export.
- Structured application form for specialists and an admission queue for Kim.
- Owner admin: approve access, approve specialists, edit domain copy, manage seats.
- Event capture for visits, profile views, booking requests and first replies.

**After launch**

- Board dashboard on real data, once there are at least a few weeks of events.
- Real availability: calendar connection and slot picking instead of requests.
- Documents room per specialist: agreement, data processing agreement, insurance, with e-signing.
- Buy-in and share invoicing, time registration and consolidated client invoicing via an accounting integration.
- Referrals between domains and the "assemble a team" flow for multi-domain briefs.
- Notifications digest, saved specialists for clients, client organisation accounts with several users.

**Principle.** Build the parts that are the house: the map, the profiles, admission and the meeting. Buy the parts every business already has: accounting, e-signing, calendar sync, email delivery. The utility box on Min side should open those tools, not reimplement them.

## 3. People and permissions

*Users.* Six kinds of people use the house. Roles are stored on a membership record, not guessed from an email domain, and every read and write in the database is enforced by row-level security so the frontend cannot leak a CV by accident.

| Role | Who | Sees | Does |
|---|---|---|---|
| Visitor | Anyone on the public site | House, domains, teaser profiles (name, title, city, skills, availability window), cases, FAQ | Requests CV access, sends a booking request, applies as a specialist |
| Client | A person Kim has granted access, usually with a company | Full CVs, rates, contact details, own booking history | Books meetings, saves specialists, manages own organisation's users (later) |
| Specialist | An admitted member with an active seat | Own profile, own inbound requests, own documents, own stats, colleagues' teaser profiles | Edits profile, imports CV, sets availability, replies to requests, uploads documents |
| Domain lead | One specialist per domain, optional at launch | Applications to their domain, domain metrics | Reviews applicants after the craft interview, edits domain copy |
| Board | Kim plus the board group | Everything a domain lead sees, across all domains, plus the KPI dashboard | Approves admissions and client access, opens and closes seats, publishes content |
| Admin | Andreas, HC while building | All data, logs, settings | Configuration, imports, support |

### Permission matrix for the sensitive objects

| Object | Visitor | Client | Specialist | Domain lead | Board |
|---|---|---|---|---|---|
| Teaser profile | read | read | read | read | read |
| Full CV, rate, contact | — | read | own | domain | all |
| Booking request | create | create, read own | read and reply to own | read domain | read all |
| Application | create | — | read own | review domain | decide |
| Access request | create | read own | — | — | decide |
| Documents (agreements) | — | — | own | — | all |
| Domain copy and seats | — | — | — | own domain | all |
| KPI dashboard | — | — | own numbers | own domain | all |

## 4. Feature plan by surface

### Public site

The landing and the freelancer page stay almost exactly as designed. Three things change under the surface: the domain list, the illustrative specialist per window and the open-seat cards read from the database so Kim can change them without a deploy; the language toggle becomes a URL prefix so Danish and English pages can be indexed and shared; and the site-wide utilities Kim asked for (press, contact on behalf of the house, privacy, terms) live in the footer, the "foundation" he settled on in the meeting.

- **House at three levels.** Street level, one window, inside. Level two shows a real specialist from that domain when one exists, otherwise the "domain is recruiting" state that the design already handles. The camera logic and the window rectangles from the SVG carry over unchanged.
- **Teaser profile inside a window.** Name, role, city, years in the craft, and whether they are alone or with colleagues. Rate and full CV stay behind the login, as the prototype's own footnote promises.
- **Cases, FAQ and utilities copy** as editable content blocks in Danish and English, with a publish state so drafts are invisible.
- **Contact block** posts to the database and notifies Kim instead of relying on a mail client.
- **Open seats on the freelancer page** come from the seat table: domains with fewer active specialists than their target show as open, with Kim's one-line reason.

### Directory: domains and profiles

The portal's domain page and profile page are the two most important screens in the product. They should be reachable by clean, stable URLs so Kim can send a link to a client and a specialist can put their own link on LinkedIn.

- **Domain page:** name, blurb, canonical skills, specialists in seat order, staffing status, and the four metrics once data exists. Before then, hide the metric tiles rather than show zeros.
- **Profile, two depths.** Everyone sees the teaser. Signed-in clients see the full page exactly as designed: summary, experience, education, certifications, languages, rate, availability, email, LinkedIn. A specialist may also add a link to their own website, which Kim explicitly wanted as the low-effort path.
- **Profile completeness** is computed from the fields present, and drives the "85 percent" bar on Min side and the ordering hint "add two references and you move up".
- **Search** across domain names, people, titles and skills, in both languages, using Postgres full-text search. It needs no separate search service at this size.
- **Portrait photos** in Supabase Storage, resized on upload, with a fallback to initials as designed.

### Access and sign-in

The prototype's password modal becomes two distinct doors, because clients and specialists arrive with different needs.

- **Clients request access** with name, work email, company and what they are looking for. Kim approves in the admin, the client receives a magic link, and from then on signs in by email link. No passwords to forget, and Kim keeps the control he asked for over who reads CVs.
- **Specialists** get an invitation when their application is accepted and their buy-in is registered. They can add a password or keep using magic links. Optional two-factor for board accounts.
- **Sessions** are handled server-side so the full CV never reaches the browser of someone who is not signed in. The landing's login modal stays as UI, but it now opens a real sign-in.
- **Deep links** such as "sign in to meet Emil" return the client to the profile they came from after sign-in.

### Booking

The designed three-step dialog is right. At launch it produces a booking request rather than a confirmed slot, because the specialists' calendars are not connected yet and false confirmations would damage trust faster than anything else.

- **Step one** keeps duration and proposed times, but the slots come from the specialist's declared weekly availability instead of a fixed list.
- **Step two** collects name, work email, company and brief. For a signed-in client these are prefilled.
- **Step three** says "request sent, you hear back within two hours" rather than "meeting booked". The specialist gets an email and sees the request on Min side; accepting or proposing another time sends both parties a calendar invite as an .ics attachment.
- **Response time**, the collective's headline KPI, is measured from request created to first specialist reply. This is why bookings have to be in the database from day one.
- **Later:** Google and Microsoft calendar connection, real free-busy slots, automatic video links, and the "domain suggests someone else" fallback when a specialist declines.

### Admission and seats

The freelancer page promises a three-week process. The system should make that visible to the applicant and cheap for Kim.

- **Application form:** name, contact, target domain (or "just name the craft"), years in the craft, CV upload, two cases, one reference, LinkedIn URL. Confirmation email with the five-working-day promise.
- **Review queue** for Kim and the domain lead with statuses: received, interview scheduled, accepted, declined, on hold. Internal notes. The applicant sees their status on a simple page.
- **Seats.** Each domain has a target number of seats, three at the start as Kim suggested. An accepted applicant is assigned a seat; the seat becomes active when the buy-in is registered and the agreement is signed. Active seats drive the open-seat cards, the "recruiting" state on the house, and the "needs specialists" status on the map.
- **Buy-in** is recorded manually by Kim at launch (paid by bank transfer against an invoice from the accounting system). Online payment can come later if volume justifies it.
- **Leaving.** One month notice, no lock-in. Deactivating a seat hides the profile, keeps the data for the retention period, and frees the seat.

### Min side: the specialist workspace

This is where a non-technical project manager, the person Kim wants to relieve of running their own website, spends their time. The launch version is deliberately small.

- **Profile editor** mirroring the LinkedIn structure the team agreed on: about, experience, education, certifications, skills, languages, rate, availability, links. Every text field in Danish and English with a "same as Danish" shortcut.
- **CV import.** Upload a PDF or a LinkedIn export and let an AI step propose the structured profile for the specialist to check and accept. This turns a forty-minute chore into five, and it is what makes the "IT house helps the other houses" idea unnecessary for most people.
- **Inbound requests** list with accept, propose new time, decline. This is the only truly operational feature at launch.
- **Availability:** weekly hours the specialist is open to first meetings, plus an "available from" date and a "fully booked until" date, which the profile and the map read.
- **Documents:** read-only at launch. The signed agreement, the data processing agreement and the insurance certificate uploaded by Kim, downloadable by the specialist. E-signing comes in a later phase.
- **Own numbers:** profile views, requests, response time. Same events as the board dashboard, filtered to one person.
- **Utility box tiles** for invoicing, time tracking and marketing are shown as "coming" or link out to the chosen external tools. Do not ship dead tiles.

### Board view and owner admin

- **Admin at launch:** access requests, applications, seats, specialists, content blocks, domain copy, and an audit log of who changed what.
- **Dashboard in phase two,** once events exist: visits per domain, profile views, booking requests, first-reply time, conversion (requests divided by domain visits), domains below staffing target, and the "needs action" list the prototype already computes. Period switch for thirty days, quarter and year.
- **Map metrics** (node size by traffic, dashed "needs" ring) read from a nightly rollup table rather than raw events, so the map stays fast.

### Email and notifications

Every state change that involves another person sends an email, in the recipient's language: access approved, application received, status changed, booking request received, request accepted with invite, weekly summary to Kim. Transactional email goes through a dedicated provider with the collective's domain verified, so nothing lands in spam on the first day.

## 5. Data model on Supabase

*Backend.* Supabase gives the project Postgres, auth, file storage, row-level security, edge functions and scheduled jobs in one EU-hosted project. The model below is the whole product; the launch phase only fills the first three groups.

| Group | Tables | Notes |
|---|---|---|
| Identity | `users` (from Auth) · `people` · `memberships` · `organisations` · `access_requests` | A person can hold several memberships (specialist in one domain, board). Clients belong to an organisation. Role lives on the membership row and is what policies check. |
| The house | `domains` · `domain_relationships` · `domain_content` · `seats` | Fifteen domains with the fixed window IDs from the house bundle as primary keys, bilingual name, blurb, skills, target seats, sort order. Relationships are the neighbour-lighting pairs. Seats carry status, holder, buy-in date, notice date. |
| Profiles | `specialist_profiles` · `experience` · `education` · `certifications` · `profile_skills` · `profile_links` · `availability` | All copy fields bilingual. A view exposes the teaser subset to anonymous readers; the full table is client-and-up. Completeness is a computed column. |
| Meetings | `booking_requests` · `booking_events` · `proposed_times` | Request holds client, specialist, duration, brief, status. Events record each reply with a timestamp, which yields first-reply time. Later joins to a `calendar_connections` table. |
| Admission | `applications` · `application_notes` · `application_files` | Status enum matches the review queue. Files point into private storage. Retention job deletes declined applications after six months. |
| Content | `content_blocks` · `cases` · `faq_items` · `open_seat_notes` | Bilingual, with published flag and updated-by. Enough for Kim to run the site without a CMS. |
| Analytics | `events` · `daily_domain_metrics` · `daily_profile_metrics` | Raw events (page view with domain, profile view, request created, reply) written from the app server. A nightly job rolls them into the daily tables that feed the map and the board. |
| Documents | `documents` · `document_versions` | Metadata only; files in a private bucket. Type: agreement, DPA, insurance, invoice. Later: e-sign status. |
| Operations | `audit_log` · `notifications` · `email_log` | Every admin action, every email sent. Cheap now, invaluable the first time someone asks "who approved this". |

### Supabase services and how the product uses them

- **Auth: magic link first, password optional.** Email OTP and magic links for clients and specialists. Custom SMTP through the transactional email provider so auth mails carry the house's domain. Board accounts can enable two-factor.
- **Row-level security: policies mirror the permission matrix.** Anonymous role reads the teaser view and published content only. Every policy is tested with the Supabase advisors and a small policy test suite before launch.
- **Storage: three buckets.** `portraits` public and resized, `cvs` private per specialist, `documents` private with signed URLs that expire in minutes.
- **Edge Functions: the few things that need a server.** CV import (PDF or LinkedIn export to structured profile via the Claude API), calendar invite generation, email dispatch webhooks, and the admission status emails.
- **Scheduled jobs: pg_cron for rollups and retention.** Nightly metrics rollup, weekly summary to Kim, deletion of declined applications and expired access requests on schedule.
- **Realtime: only where it earns its place.** Live update of the inbound request list on Min side. The public site and map are cached and do not need it.
- **Branching: one database per preview.** Supabase branches paired with Vercel preview deployments, so a pull request can be tried against its own schema and seed data without touching production.
- **Region and backups: EU (Frankfurt), point-in-time recovery.** CVs are personal data. Hosting in the EU and daily backups with point-in-time recovery are launch requirements, not upgrades.

## 6. Architecture on Vercel

*Frontend and hosting.* One Next.js application on Vercel serves both the public site and the portal. This keeps the design system, the house component and the bilingual copy in one place, and lets the public pages be static and fast while the portal is rendered per user.

**Rendering**

- Public pages (landing, freelancer page, domain pages, teaser profiles) are statically generated and revalidated when Kim publishes content, so they load instantly and are indexable.
- Portal pages render on the server per request with the user's session, so a CV never leaves the server for someone not allowed to see it.
- The house component is loaded on the client only, after the page paints, and its half-megabyte bundle is served with long cache headers from Vercel's edge.

**Routing and language**

- Language in the path: `/da` and `/en`, Danish as default. Middleware picks the language from the path, then the user's setting, then the browser.
- Stable URLs: `/da/domaener/ai-it`, `/da/specialister/navn`, `/portal/kort`, `/portal/min-side`, `/admin`.
- Middleware refreshes the Supabase session and guards `/portal` and `/admin` by role.

**Environments**

- Production on `trustusconsult.dk` with the portal under the same domain. Preview deployments per pull request, each bound to a Supabase branch. A long-lived staging branch for Kim to review content and flows.
- Secrets in Vercel environment variables, scoped per environment. The Supabase service key only in server-side functions, never in the browser bundle.
- Deployment protection on previews so half-built screens are never public.

**Observability and delivery**

- Vercel Analytics for web vitals and the domain page-view events that feed the board KPIs. Error tracking with source maps. Supabase logs and advisors checked in the go-live review.
- Vercel Cron as the fallback scheduler if a job is better run in the app than in the database.
- Image optimisation for portraits and case images; fonts self-hosted from the design system folder, as the prototype already does.

## 7. Migrating the prototype

*Migration.* The Claude Design files are a specification, not a codebase. The rebuild is a translation, and most of it is mechanical. The points below are the ones that need a decision or care.

- **Design system.** The project holds two: the an-ui system with the Huset retint, used by the artboards, and a separate published Huset React library with twenty-seven components and its own tokens. Pick one before building screens. The Huset library is the better long-term home because it already encodes the brand rules (one orange entry button per surface, gold for people and values, dark type on gold and orange). The an-ui page components (section heading, motion band, capability list, timeline, contact block) would be ported into it.
- **Portal palette.** The portal's olive tokens come from a third system and clash with the brand. Re-tint the portal to Huset when porting; the layouts do not change.
- **The house component** is kept verbatim as a web component and wrapped in a small React component that pushes configuration from the database and forwards its events. The camera and zoom logic in the landing moves into that wrapper.
- **Runtime.** Drop the in-browser Babel and unpkg loading entirely; they are the reason the prototype cannot ship. The logo-injection timer and the "find the house every second" polling disappear with it.
- **Data.** Every getter in the prototype scripts (domains, house copy, specialists, edges, profiles) becomes seed data for the domain and content tables. The fourteen illustrative people are not seeded. The real profile in the portal is seeded only with its owner's consent and with the private email replaced.
- **Copy.** The Danish and English strings are already paired throughout. They move into a translation file for interface copy and into bilingual columns for content Kim edits.
- **Prototype devices** to remove: the role cycler, the "any login works" gate, the fixed slot list, the fake confirmation, the "illustrative" footnotes once real specialists are live.

## 8. Trust, GDPR and legal

*Compliance.* The product's whole pitch is trust, and it stores CVs, rates, and client briefs. Treat data protection as a feature the house advertises.

- **Lawful basis and consent.** Specialists consent to publication of their teaser and to client access to the full CV as part of the membership agreement. Clients accept terms when requesting access. Both are recorded with a timestamp.
- **Data processing agreements** with Supabase, Vercel and the email provider on file. EU hosting for the database and storage. Note which sub-processors run outside the EU and disclose them in the privacy notice.
- **Privacy notice, cookie notice, terms for clients, membership agreement for specialists,** all bilingual and linked from the footer. The legal domain in the house is the natural reviewer, which is also a good story to tell.
- **Retention and erasure.** Declined applications deleted after six months, expired access requests after ninety days, departed specialists' full profiles after the notice period plus a documented grace period. A specialist can export their profile.
- **Minimal analytics.** First-party event capture only, no third-party trackers, so the cookie banner can be a single line and the numbers on the board are the house's own.
- **Security basics:** row-level security tested, signed URLs for private files, rate limits on the public forms, audit log for admin actions, two-factor for the board.
- **Accessibility** is already a strength of the prototype (skip link, reduced motion, keyboard operable windows). Keep it: the house must remain fully usable without a mouse, and every window and card needs a text equivalent.

## 9. Phased roadmap

Durations assume the current team of a designer-developer, one or two developers and Kim as product owner, working part time. Each phase has an exit criterion that Kim can verify by clicking, not by reading a report.

### Phase 0 · Foundations (1 to 2 weeks)

Decide the canonical domain list, the design system and the URL structure. Set up the Supabase project in the EU, the Vercel project, environments, email provider and domain. Create the schema for identity, the house and profiles with row-level security. Seed the fifteen domains and relationships. Port the design tokens.

**Exit:** a preview URL shows the house with domain data from the database, in both languages.

### Phase 1 · Public site and directory (3 to 4 weeks)

Landing and freelancer pages rebuilt. Domain pages and teaser profiles. Content blocks editable by Kim in a plain admin. Application form and access request form writing to the database with confirmation emails. Event capture live.

**Exit:** Kim edits a domain blurb and sees it on the staging site; a test applicant receives the confirmation email.

### Phase 2 · Sign-in, full CVs and booking requests (3 to 4 weeks)

Client access approval and magic-link sign-in. Full profile behind login. Specialist invitation, profile editor and CV import. Booking request flow end to end with emails and calendar invites. Min side with inbound requests and availability. Admission queue and seats.

**Exit:** a real client books a real meeting with a real specialist through the site, and the reply time appears in the database.

### Launch · Onboard the first specialists and open the door (1 week)

Import the founding specialists' CVs with them on a call. Remove every illustrative person and footnote. Run the go-live checklist. Point the domain at production. Announce on LinkedIn from the collective's page.

**Exit:** the house is public with at least one real specialist per staffed domain and the recruiting state on the rest.

### Phase 3 · Board dashboard and documents (4 to 6 weeks)

The board view on real rollups with period switching and the needs-action list. Documents room with agreements uploaded by Kim, then e-signing integration. Domain lead role. Weekly summary email.

**Exit:** Kim opens the board view on a Monday and knows which domain to call.

### Phase 4 · Utilities (ongoing)

Calendar connections and true slot booking. Accounting integration for buy-in, share and consolidated invoicing. Time registration if the collective takes over client invoicing. Referrals and team assembly for multi-domain briefs. Client organisations with several users and saved specialists.

**Exit:** each utility tile on Min side opens something that works, or is not shown.

## 10. Go-live checklist

- [ ] Canonical fifteen domains, names and IDs identical in house, landing, portal and database
- [ ] Row-level security policies tested for every role, including anonymous
- [ ] Supabase advisors clean: no public tables without policies, no exposed service key
- [ ] Point-in-time recovery enabled, restore rehearsed once
- [ ] Custom SMTP verified, SPF, DKIM and DMARC records set, test mails land in inbox
- [ ] Privacy notice, cookie notice, client terms, membership agreement published in both languages
- [ ] Data processing agreements signed with each provider
- [ ] Every illustrative person, rate and footnote removed; real profiles have consent on record
- [ ] House bundle served compressed with long cache; landing loads under three seconds on a mid-range phone
- [ ] Keyboard walk-through of house, booking dialog and sign-in without a mouse
- [ ] Both languages proof-read on every public page; no untranslated strings
- [ ] Analytics events firing for page view, profile view, request created, first reply
- [ ] Error tracking receiving a deliberate test error from production
- [ ] Rate limits on application, access request, contact and booking forms
- [ ] Admin audit log records approvals and content edits
- [ ] Preview deployments protected; production domain, redirects and sitemap in place
- [ ] Old prototype links and file-name URLs redirect to the new paths
- [ ] Support address and escalation agreed: who answers a specialist locked out on a Sunday

## 11. Decisions for Kim

- **Canonical domain names.** Which of the two name variants wins for domains four and ten, and whether English names are translations or the Danish names kept as brands.
- **Who may read a full CV.** Approved clients only, as the prototype implies, or any signed-up visitor with a work email. The first protects specialists; the second lowers friction.
- **Seats per domain.** Three as discussed, or a per-domain target Kim sets. Both are supported; the number drives the "recruiting" state.
- **Booking model at launch.** Request with proposed times (recommended) versus a fixed set of bookable slots per specialist that they must keep honest by hand.
- **Contract party.** The landing says clients contract with the collective and get one invoice. That is a phase four operational commitment; confirm the wording for launch or soften it until invoicing exists.
- **Buy-in payment.** Manual bank transfer against an invoice at launch, or online payment from day one.
- **Domain leads.** Whether a specialist per domain gets review rights at launch or all admission decisions stay with Kim initially.
- **Design system.** Consolidate on the Huset React library (recommended) or continue with the an-ui retint.
- **Accounting and e-signing tools.** Which systems the collective already uses, so the utility integrations are chosen, not built.

## 12. Risks

- **An empty house.** Fifteen windows and few real specialists. The recruiting state is designed for this, but the landing's facts ("fifteen specialists", "under six hours response") must be replaced with true figures or removed until true.
- **Trust promises ahead of operations.** One invoice, one contract, thirty-day terms and liability cover are advertised. Either the collective can deliver them at launch or the copy says "coming" honestly.
- **Response time.** The KPI only looks good if specialists reply. Email notification plus a daily nudge for unanswered requests is the minimum; without it the headline number will embarrass the house.
- **Personal data.** The prototype already contains a real private email in seed data. Scrubbing and consent must be part of the process, not a final check.
- **Bundle weight.** The house artwork is half a megabyte compressed and several thousand SVG nodes. It is fine on desktop and needs testing on older phones, with a still image fallback if it stalls.
- **Two design systems.** Building screens before choosing one will double the styling work later.
- **Scope pull.** The utility box is attractive and each tile is a product. Holding phase four to integrations keeps the launch inside a quarter.

---

TrustUsConsult · Go-live plan · Draft 11 September 2026 · Prepared from the Claude Design project "Freelance Portal Map Interface" and the 16 August 2026 meeting notes
