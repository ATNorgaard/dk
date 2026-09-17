import { createClient } from "@/lib/supabase/server";
import type { I18nList, I18nText } from "@/lib/i18n";
import type { Role } from "@/lib/auth";

/**
 * Reads for the admin pages, through the signed-in user's client so
 * row-level security decides what comes back. Board and admin see
 * everything below; anyone else gets empty lists.
 */

export type ApplicationStatus = "received" | "interview" | "accepted" | "declined" | "on_hold";
export const APPLICATION_STATUSES: ApplicationStatus[] = ["received", "interview", "accepted", "declined", "on_hold"];

export type ApplicationRow = {
  id: string;
  created_at: string;
  lang: string;
  domain_id: string | null;
  craft: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  linkedin_url: string | null;
  years_in_craft: number | null;
  cases: string | null;
  reference_note: string | null;
  message: string | null;
  status: ApplicationStatus;
  decided_at: string | null;
  internal_note: string | null;
};

export type NoteRow = {
  id: string;
  body: string;
  created_at: string;
  author: { display_name: string } | null;
};

export type ContactRow = {
  id: string;
  created_at: string;
  lang: string;
  domain_id: string | null;
  full_name: string;
  email: string;
  company: string | null;
  message: string;
  handled_at: string | null;
  internal_note: string | null;
};

export type DomainRow = {
  id: string;
  sort_order: number;
  slug: string;
  name: I18nText;
  tagline: I18nText | null;
  blurb: I18nText | null;
  house_description: I18nText | null;
  skills: I18nList;
  target_seats: number;
  status_override: "healthy" | "needs" | "full" | null;
  is_published: boolean;
};

export type SeatStatus = "open" | "reserved" | "active" | "notice" | "closed";
export const SEAT_STATUSES: SeatStatus[] = ["open", "reserved", "active", "notice", "closed"];

export type SeatRow = {
  id: string;
  domain_id: string;
  position: number;
  status: SeatStatus;
  holder_person_id: string | null;
  buy_in_paid_at: string | null;
  notice_given_at: string | null;
  ends_at: string | null;
  note: I18nText | null;
  holder: { display_name: string; email: string } | null;
};

export type PersonRow = {
  id: string;
  display_name: string;
  email: string;
  lang: string;
  user_id: string | null;
  memberships: { id: string; role: Role; domain_id: string | null; status: string }[];
};

export type MetricRow = {
  domain_id: string;
  domain_views: number;
  window_hovers: number;
  contacts: number;
  applications: number;
  visitors: number;
};

export type AuditRow = {
  id: number;
  at: string;
  table_name: string;
  row_id: string;
  action: "insert" | "update" | "delete";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  actor: { display_name: string } | null;
};

/** Unwrap a query, logging the error: an admin page showing "none" must not hide a broken query. */
function rows<T>(what: string) {
  return (res: { data: T[] | null; error: { message: string } | null }): T[] => {
    if (res.error) console.error(`admin ${what}:`, res.error.message);
    return res.data ?? [];
  };
}

export async function listApplications(status?: ApplicationStatus) {
  const supabase = await createClient();
  let q = supabase
    .from("applications")
    .select("id, created_at, lang, domain_id, craft, full_name, email, years_in_craft, status, decided_at")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  return rows<ApplicationRow>("applications")(await q.returns<ApplicationRow[]>());
}

export async function getApplication(id: string) {
  const supabase = await createClient();
  const [apps, notes] = await Promise.all([
    supabase.from("applications").select("*").eq("id", id).limit(1).returns<ApplicationRow[]>(),
    supabase
      .from("application_notes")
      .select("id, body, created_at, author:people!author_person_id(display_name)")
      .eq("application_id", id)
      .order("created_at")
      .returns<NoteRow[]>(),
  ]);
  const application = rows<ApplicationRow>("application")(apps)[0];
  return application ? { application, notes: rows<NoteRow>("notes")(notes) } : null;
}

export async function listContacts(handled: boolean) {
  const supabase = await createClient();
  let q = supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  q = handled ? q.not("handled_at", "is", null) : q.is("handled_at", null);
  return rows<ContactRow>("contacts")(await q.returns<ContactRow[]>());
}

export type AccessStatus = "received" | "approved" | "declined";
export type AccessRow = {
  id: string;
  created_at: string;
  lang: string;
  full_name: string;
  email: string;
  company: string | null;
  message: string | null;
  source_slug: string | null;
  status: AccessStatus;
  decided_at: string | null;
  internal_note: string | null;
  decided_by: { display_name: string } | null;
};

export async function listAccessRequests(decided: boolean) {
  const supabase = await createClient();
  let q = supabase
    .from("access_requests")
    .select("id, created_at, lang, full_name, email, company, message, source_slug, status, decided_at, internal_note, decided_by:people!decided_by(display_name)")
    .order("created_at", { ascending: false });
  q = decided ? q.neq("status", "received") : q.eq("status", "received");
  return rows<AccessRow>("access requests")(await q.returns<AccessRow[]>());
}

export async function listDomainsForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("domains")
    .select("id, sort_order, slug, name, tagline, blurb, house_description, skills, target_seats, status_override, is_published")
    .order("sort_order")
    .returns<DomainRow[]>();
  return rows<DomainRow>("domains")({ data, error: null });
}

export async function getDomainForAdmin(id: string) {
  const all = await listDomainsForAdmin();
  return all.find((d) => d.id === id) ?? null;
}

export async function listSeats() {
  const supabase = await createClient();
  const res = await supabase
    .from("seats")
    .select("id, domain_id, position, status, holder_person_id, buy_in_paid_at, notice_given_at, ends_at, note, holder:people!holder_person_id(display_name, email)")
    .order("domain_id")
    .order("position")
    .returns<SeatRow[]>();
  return rows<SeatRow>("seats")(res);
}

export async function listPeople() {
  const supabase = await createClient();
  const res = await supabase
    .from("people")
    .select("id, display_name, email, lang, user_id, memberships!person_id(id, role, domain_id, status)")
    .order("display_name")
    .returns<PersonRow[]>();
  return rows<PersonRow>("people")(res);
}

/** Sums of the daily rollup over the last `days` days, one row per domain. */
export async function metricsByDomain(days = 30) {
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("daily_domain_metrics")
    .select("domain_id, domain_views, window_hovers, contacts, applications, visitors")
    .gte("day", since)
    .returns<MetricRow[]>();
  const sums = new Map<string, MetricRow>();
  for (const r of data ?? []) {
    const s = sums.get(r.domain_id) ?? { domain_id: r.domain_id, domain_views: 0, window_hovers: 0, contacts: 0, applications: 0, visitors: 0 };
    s.domain_views += Number(r.domain_views);
    s.window_hovers += Number(r.window_hovers);
    s.contacts += Number(r.contacts);
    s.applications += Number(r.applications);
    s.visitors += Number(r.visitors);
    sums.set(r.domain_id, s);
  }
  return sums;
}

export async function listAuditLog(limit = 200) {
  const supabase = await createClient();
  const res = await supabase
    .from("audit_log")
    .select("id, at, table_name, row_id, action, old_data, new_data, actor:people!actor_person_id(display_name)")
    .order("at", { ascending: false })
    .limit(limit)
    .returns<AuditRow[]>();
  return rows<AuditRow>("audit log")(res);
}

export async function overviewCounts() {
  const supabase = await createClient();
  const [apps, contacts, access, people, bookingsQ] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).is("handled_at", null),
    supabase.from("access_requests").select("id", { count: "exact", head: true }).eq("status", "received"),
    supabase.from("people").select("id", { count: "exact", head: true }),
    supabase.from("booking_requests").select("id", { count: "exact", head: true }).in("status", ["requested", "proposed"]),
  ]);
  return { newApplications: apps.count ?? 0, openContacts: contacts.count ?? 0, openAccess: access.count ?? 0, people: people.count ?? 0, openBookings: bookingsQ.count ?? 0 };
}
