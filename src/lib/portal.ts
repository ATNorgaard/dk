import { createClient } from "@/lib/supabase/server";
import { hasRole, type Viewer } from "@/lib/auth";
import type { Lang } from "@/lib/i18n";
import { listAccessRequests, listApplications, listAuditLog, listContacts, listSeats, overviewCounts, type SeatRow } from "@/lib/admin";
import { completenessChecklist, isLive, loadFullProfile, type FullProfile } from "@/lib/specialists";
import { hoursBetween, listAllBookings, listMyBookings, type Booking } from "@/lib/bookings";

/**
 * What the signed-in side needs beyond a single page: the counts on the
 * sidebar badges and the two dashboards on /portal. Everything reads
 * through the per-request client, so row-level security decides what a
 * board member, a specialist or a client actually sees.
 */

export type PortalCounts = { applications: number; access: number; contacts: number; bookings: number; myRequests: number };

export async function portalCounts(viewer: Viewer): Promise<PortalCounts> {
  const counts: PortalCounts = { applications: 0, access: 0, contacts: 0, bookings: 0, myRequests: 0 };
  const jobs: Promise<void>[] = [];
  if (hasRole(viewer, "board", "admin")) {
    jobs.push(
      overviewCounts().then((c) => {
        counts.applications = c.newApplications;
        counts.access = c.openAccess;
        counts.contacts = c.openContacts;
        counts.bookings = c.openBookings;
      }),
    );
  }
  if (hasRole(viewer, "specialist") && viewer.person) {
    jobs.push(
      (async () => {
        const supabase = await createClient();
        const { data } = await supabase.from("specialist_profiles").select("id").eq("person_id", viewer.person!.id).limit(1).returns<{ id: string }[]>();
        const pid = data?.[0]?.id;
        if (!pid) return;
        const { count } = await supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("profile_id", pid).eq("status", "requested");
        counts.myRequests = count ?? 0;
      })(),
    );
  }
  await Promise.all(jobs);
  return counts;
}

/* Specialist dashboard */

export type SpecialistDashboard = {
  full: FullProfile;
  live: boolean;
  statusKey: "draft" | "publishedNoSeat" | "live";
  checklist: ReturnType<typeof completenessChecklist>;
  pct: number;
  needsReply: Booking[];
  awaitingClient: Booking[];
  nextMeeting: { booking: Booking; startsAt: string } | null;
};

export async function specialistDashboard(viewer: Viewer): Promise<SpecialistDashboard | null> {
  if (!viewer.person) return null;
  const full = await loadFullProfile({ personId: viewer.person.id });
  if (!full) return null;
  const [live, bookings] = await Promise.all([isLive(full.profile.id), listMyBookings(full.profile.id)]);
  const checklist = completenessChecklist(full);
  const pct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const now = new Date().toISOString();
  const agreed = bookings
    .filter((b) => b.status === "accepted" && b.accepted_time_id)
    .map((b) => ({ booking: b, startsAt: b.times.find((t) => t.id === b.accepted_time_id)?.starts_at ?? "" }))
    .filter((x) => x.startsAt > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return {
    full,
    live,
    statusKey: live ? "live" : full.profile.is_published ? "publishedNoSeat" : "draft",
    checklist,
    pct,
    needsReply: bookings.filter((b) => b.status === "requested").sort((a, b) => a.created_at.localeCompare(b.created_at)),
    awaitingClient: bookings.filter((b) => b.status === "proposed"),
    nextMeeting: agreed[0] ?? null,
  };
}

/* Board dashboard */

export type Waiting = { kind: "application" | "access" | "contact" | "booking"; name: string; detail: string; since: string; href: string };

export type BoardDashboard = {
  queues: { applications: { n: number; oldest: string | null }; access: { n: number; oldest: string | null }; contacts: { n: number; oldest: string | null }; bookings: { n: number; oldest: string | null } };
  kpi: { medianHours: number | null; replied: number; over24h: number };
  waiting: Waiting[];
  seats: Record<string, SeatRow[]>;
  activity: { at: string; actor: string; action: string; table: string }[];
};

export async function boardDashboard(lang: Lang): Promise<BoardDashboard> {
  const [apps, access, contacts, bookings, seats, audit] = await Promise.all([
    listApplications("received"),
    listAccessRequests(false),
    listContacts(false),
    listAllBookings(),
    listSeats(),
    listAuditLog(10),
  ]);
  const oldest = (dates: string[]) => (dates.length ? dates.slice().sort()[0] : null);
  const openBookings = bookings.filter((b) => b.status === "requested");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const replies = bookings.filter((b) => b.first_reply_at && b.first_reply_at > thirtyDaysAgo).map((b) => hoursBetween(b.created_at, b.first_reply_at!)).sort((a, b) => a - b);
  const median = replies.length ? replies[Math.floor(replies.length / 2)] : null;
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const waiting: Waiting[] = [
    ...apps.map((a) => ({ kind: "application" as const, name: a.full_name, detail: a.domain_id ?? a.craft ?? "", since: a.created_at, href: `/${lang}/admin/ansoegninger/${a.id}` })),
    ...access.map((a) => ({ kind: "access" as const, name: a.full_name, detail: a.company ?? "", since: a.created_at, href: `/${lang}/admin/adgang` })),
    ...contacts.map((c) => ({ kind: "contact" as const, name: c.full_name, detail: c.company ?? "", since: c.created_at, href: `/${lang}/admin/henvendelser` })),
    ...openBookings.map((b) => ({ kind: "booking" as const, name: b.full_name, detail: b.profile?.people?.display_name ?? "", since: b.created_at, href: `/${lang}/admin/bookinger` })),
  ]
    .sort((a, b) => a.since.localeCompare(b.since))
    .slice(0, 8);

  const byDomain: Record<string, SeatRow[]> = {};
  for (const s of seats) (byDomain[s.domain_id] ??= []).push(s);
  for (const list of Object.values(byDomain)) list.sort((a, b) => a.position - b.position);

  return {
    queues: {
      applications: { n: apps.length, oldest: oldest(apps.map((a) => a.created_at)) },
      access: { n: access.length, oldest: oldest(access.map((a) => a.created_at)) },
      contacts: { n: contacts.length, oldest: oldest(contacts.map((c) => c.created_at)) },
      bookings: { n: openBookings.length, oldest: oldest(openBookings.map((b) => b.created_at)) },
    },
    kpi: { medianHours: median, replied: replies.length, over24h: openBookings.filter((b) => b.created_at < dayAgo).length },
    waiting,
    seats: byDomain,
    activity: audit.map((r) => ({ at: r.at, actor: r.actor?.display_name ?? "", action: r.action, table: r.table_name })),
  };
}

/** "4 d", "6 t", "12 min": how long since an ISO timestamp, in the reader's language. */
export function age(iso: string, lang: Lang) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} ${lang === "da" ? "t" : "h"}`;
  return `${Math.round(hours / 24)} ${lang === "da" ? "d" : "d"}`;
}
