"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer, requireViewer } from "@/lib/auth";
import { href, isLang, type Lang } from "@/lib/i18n";
import { sendEmail } from "@/lib/email";
import { buildIcs } from "@/lib/email/ics";
import { bookingAccepted, bookingCancelled, bookingDeclined, bookingProposed, bookingReceived, bookingRequested } from "@/lib/email/templates";
import { bookings as copy } from "@/content/bookings";
import { admin as adminCopy } from "@/content/admin";
import { loadBookingByToken } from "@/lib/bookings";
import type { FormState } from "@/app/actions/intake";
import type { AdminState } from "@/app/actions/admin";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function langOf(fd: FormData): Lang {
  const l = str(fd, "lang", 2);
  return isLang(l) ? l : "da";
}
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host") ?? "www.trustusconsult.dk";
  return `${host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https"}://${host}`;
}
/** A datetime-local value ("2026-09-24T10:00") entered in Copenhagen time → ISO instant. */
function localToIso(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  // Copenhagen is UTC+1 or +2; derive the offset for that date from Intl.
  const probe = new Date(`${v}:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Copenhagen", timeZoneName: "shortOffset" }).formatToParts(probe);
  const off = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = /GMT([+-])(\d{1,2})/.exec(off);
  const hours = m ? Number(m[2]) * (m[1] === "-" ? -1 : 1) : 1;
  const d = new Date(probe.getTime() - hours * 3_600_000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* The visitor's request, from the three-step form on the specialist page */

export async function submitBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  if (str(fd, "website", 200)) return { status: "ok" }; // honeypot
  const profile_id = str(fd, "profile_id", 40);
  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email", 200).toLowerCase();
  const company = str(fd, "company", 160) || null;
  const brief = str(fd, "brief", 4000);
  const duration = Number(str(fd, "duration", 3)) === 45 ? 45 : 20;
  const consent = fd.get("consent") === "on";
  const now = Date.now();
  const times = ["time1", "time2", "time3"]
    .map((k) => localToIso(str(fd, k, 20)))
    .filter((t): t is string => !!t && new Date(t).getTime() > now);

  const fields: Record<string, string> = {};
  const c = lang === "da" ? { required: "Udfyld feltet.", email: "Skriv en gyldig e-mailadresse.", consent: "Du skal acceptere, at vi behandler dine oplysninger.", short: "Skriv lidt mere.", failed: "Vi kunne ikke sende forespørgslen. Prøv igen." } : { required: "This field is required.", email: "Enter a valid email address.", consent: "You need to accept that we process your details.", short: "Write a little more.", failed: "We could not send the request. Try again." };
  if (!profile_id) return { status: "error", message: c.failed };
  if (full_name.length < 2) fields.full_name = c.required;
  if (!EMAIL.test(email)) fields.email = c.email;
  if (brief.length < 5) fields.brief = c.short;
  if (!consent) fields.consent = c.consent;
  if (!times.length) fields.time1 = copy.form.errors.time[lang];
  if (Object.keys(fields).length) return { status: "error", message: "", fields };

  const viewer = await getViewer();
  const supabase = createPublicClient();
  // The anon role may insert but never read this table, so the row cannot
  // come back from the insert; the id and token are minted here instead.
  const req = { id: randomUUID(), client_token: randomBytes(24).toString("hex") };
  const { error } = await supabase
    .from("booking_requests")
    .insert({ ...req, lang, profile_id, client_person_id: viewer?.person?.id ?? null, full_name, email, company, brief, duration_minutes: duration, consent_at: new Date().toISOString() });
  if (error) {
    console.error("booking insert:", error.message);
    return { status: "error", message: c.failed };
  }
  await supabase.from("proposed_times").insert(times.map((starts_at) => ({ request_id: req.id, starts_at, proposed_by: "client" })));
  await supabase.from("booking_events").insert({ request_id: req.id, actor: "client", type: "requested" });

  // Specialist's address and name through the service client (the public role cannot read people).
  const admin = createAdminClient();
  type P = { slug: string; people: { display_name: string; email: string; lang: string } };
  const { data: prof } = await admin.from("specialist_profiles").select("slug, people!person_id(display_name, email, lang)").eq("id", profile_id).limit(1).returns<P[]>();
  const sp = prof?.[0];
  const base = await origin();
  const pageUrl = `${base}/${lang}/booking/${req.id}?t=${req.client_token}`;
  if (sp) {
    const sLang: Lang = sp.people.lang === "en" ? "en" : "da";
    await Promise.all([
      sendEmail(bookingRequested(sLang, sp.people.email, { clientName: full_name, company, brief, minutes: duration, times, minSideUrl: `${base}/${sLang}/portal/min-side#moeder` })),
      sendEmail(bookingReceived(lang, email, full_name, sp.people.display_name, pageUrl)),
    ]);
  }
  return { status: "ok" };
}

/* The specialist's replies, from Min side (RLS: own requests only) */

async function specialistContext(fd: FormData) {
  const lang = langOf(fd);
  const path = str(fd, "path", 200) || href(lang, "/portal/min-side");
  const viewer = await requireViewer(lang, path);
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  type B = { id: string; lang: string; full_name: string; email: string; duration_minutes: number; status: string; first_reply_at: string | null; client_token: string; profile: { people: { display_name: string; email: string } } };
  const { data } = await supabase
    .from("booking_requests")
    .select("id, lang, full_name, email, duration_minutes, status, first_reply_at, client_token, profile:specialist_profiles!profile_id(people!person_id(display_name, email))")
    .eq("id", id)
    .limit(1)
    .returns<B[]>();
  const booking = data?.[0] ?? null;
  const ok = (message: string): AdminState => {
    revalidatePath(path);
    return { status: "ok", message };
  };
  const fail = (): AdminState => ({ status: "error", message: adminCopy.common.failed[lang] });
  return { lang, path, viewer, supabase, booking, ok, fail };
}

async function stampFirstReply(supabase: Awaited<ReturnType<typeof createClient>>, booking: { id: string; first_reply_at: string | null }, patch: Record<string, unknown>) {
  return supabase
    .from("booking_requests")
    .update({ ...patch, ...(booking.first_reply_at ? {} : { first_reply_at: new Date().toISOString() }) })
    .eq("id", booking.id);
}

async function sendAgreed(b: { id: string; lang: string; full_name: string; email: string; duration_minutes: number; client_token: string; profile: { people: { display_name: string; email: string } } }, startsAt: string, base: string) {
  const cLang: Lang = b.lang === "en" ? "en" : "da";
  const ics = buildIcs({
    uid: b.id,
    startsAt: new Date(startsAt),
    minutes: b.duration_minutes,
    summary: `TrustUsConsult: ${b.profile.people.display_name} & ${b.full_name}`,
    description: `Første møde via TrustUsConsult. ${b.duration_minutes} minutter.`,
    organiser: { name: b.profile.people.display_name, email: b.profile.people.email },
    attendee: { name: b.full_name, email: b.email },
  });
  const pageUrl = `${base}/${cLang}/booking/${b.id}?t=${b.client_token}`;
  await Promise.all([
    sendEmail(bookingAccepted(cLang, b.email, { recipientName: b.full_name, otherName: b.profile.people.display_name, startsAt, minutes: b.duration_minutes, ics, pageUrl })),
    sendEmail(bookingAccepted("da", b.profile.people.email, { recipientName: b.profile.people.display_name, otherName: b.full_name, startsAt, minutes: b.duration_minutes, ics })),
  ]);
}

export async function acceptTime(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await specialistContext(fd);
  const time_id = str(fd, "time_id", 40);
  if (!c.booking || !time_id || c.booking.status === "accepted" || c.booking.status === "cancelled") return c.fail();
  const { data: t } = await c.supabase.from("proposed_times").select("id, starts_at").eq("id", time_id).eq("request_id", c.booking.id).limit(1).returns<{ id: string; starts_at: string }[]>();
  if (!t?.[0]) return c.fail();
  const { error } = await stampFirstReply(c.supabase, c.booking, { status: "accepted", accepted_time_id: time_id });
  if (error) return c.fail();
  await c.supabase.from("booking_events").insert({ request_id: c.booking.id, actor: "specialist", actor_person_id: c.viewer.person?.id ?? null, type: "accepted", time_id });
  await sendAgreed(c.booking, t[0].starts_at, await origin());
  revalidatePath(href(c.lang, "/admin/bookinger"));
  return c.ok(copy.minSide.accepted[c.lang]);
}

export async function proposeTime(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await specialistContext(fd);
  const starts_at = localToIso(str(fd, "starts_at", 20));
  if (!c.booking || !starts_at || new Date(starts_at).getTime() < Date.now() || c.booking.status === "cancelled") return c.fail();
  const { data: t, error: tErr } = await c.supabase.from("proposed_times").insert({ request_id: c.booking.id, starts_at, proposed_by: "specialist" }).select("id").returns<{ id: string }[]>();
  if (tErr || !t?.[0]) return c.fail();
  const { error } = await stampFirstReply(c.supabase, c.booking, { status: "proposed" });
  if (error) return c.fail();
  await c.supabase.from("booking_events").insert({ request_id: c.booking.id, actor: "specialist", actor_person_id: c.viewer.person?.id ?? null, type: "proposed", time_id: t[0].id });
  const cLang: Lang = c.booking.lang === "en" ? "en" : "da";
  const base = await origin();
  await sendEmail(bookingProposed(cLang, c.booking.email, { clientName: c.booking.full_name, specialistName: c.booking.profile.people.display_name, startsAt: starts_at, pageUrl: `${base}/${cLang}/booking/${c.booking.id}?t=${c.booking.client_token}` }));
  return c.ok(copy.minSide.proposed[c.lang]);
}

export async function declineBooking(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await specialistContext(fd);
  if (!c.booking || c.booking.status === "cancelled") return c.fail();
  const note = str(fd, "note", 2000) || null;
  const { error } = await stampFirstReply(c.supabase, c.booking, { status: "declined" });
  if (error) return c.fail();
  await c.supabase.from("booking_events").insert({ request_id: c.booking.id, actor: "specialist", actor_person_id: c.viewer.person?.id ?? null, type: "declined", message: note });
  const cLang: Lang = c.booking.lang === "en" ? "en" : "da";
  await sendEmail(bookingDeclined(cLang, c.booking.email, { clientName: c.booking.full_name, specialistName: c.booking.profile.people.display_name, note }));
  return c.ok(copy.minSide.declined[c.lang]);
}

/* The requester's actions, from the page in their mail (token is the credential) */

async function clientContext(fd: FormData) {
  const lang = langOf(fd);
  const id = str(fd, "id", 40);
  const token = str(fd, "token", 60);
  const booking = await loadBookingByToken(id, token);
  const path = href(lang, `/booking/${id}`);
  const ok = (message: string): AdminState => {
    revalidatePath(path);
    return { status: "ok", message };
  };
  const fail = (): AdminState => ({ status: "error", message: adminCopy.common.failed[lang] });
  return { lang, booking, token, ok, fail };
}

export async function clientAcceptProposal(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await clientContext(fd);
  const time_id = str(fd, "time_id", 40);
  if (!c.booking || c.booking.status !== "proposed") return c.fail();
  const t = c.booking.times.find((x) => x.id === time_id && x.proposed_by === "specialist");
  if (!t) return c.fail();
  const admin = createAdminClient();
  const { error } = await admin.from("booking_requests").update({ status: "accepted", accepted_time_id: t.id }).eq("id", c.booking.id);
  if (error) return c.fail();
  await admin.from("booking_events").insert({ request_id: c.booking.id, actor: "client", type: "accepted", time_id: t.id });
  await sendAgreed(
    { id: c.booking.id, lang: c.booking.lang, full_name: c.booking.full_name, email: c.booking.email, duration_minutes: c.booking.duration_minutes, client_token: c.token, profile: { people: { display_name: c.booking.specialist.name, email: c.booking.specialist.email } } },
    t.starts_at,
    await origin(),
  );
  return c.ok(copy.clientPage.acceptedText[c.lang]);
}

export async function clientCancel(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await clientContext(fd);
  if (!c.booking || c.booking.status === "cancelled") return c.fail();
  const admin = createAdminClient();
  const { error } = await admin.from("booking_requests").update({ status: "cancelled" }).eq("id", c.booking.id);
  if (error) return c.fail();
  await admin.from("booking_events").insert({ request_id: c.booking.id, actor: "client", type: "cancelled" });
  await sendEmail(bookingCancelled(c.booking.specialist.lang === "en" ? "en" : "da", c.booking.specialist.email, c.booking.full_name));
  return c.ok(copy.clientPage.cancelledText[c.lang]);
}
