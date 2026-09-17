import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { I18nText } from "@/lib/i18n";

/**
 * Booking requests. Specialists, board and clients read through the
 * signed-in client (RLS). The requester's own page reads through the
 * service client after the token in their mail has been checked.
 */

export type BookingStatus = "requested" | "accepted" | "proposed" | "declined" | "cancelled";

export type ProposedTime = { id: string; starts_at: string; proposed_by: "client" | "specialist" };
export type BookingEvent = { id: string; at: string; actor: string; type: string; message: string | null; time_id: string | null };

export type Booking = {
  id: string;
  created_at: string;
  lang: string;
  profile_id: string;
  client_person_id: string | null;
  full_name: string;
  email: string;
  company: string | null;
  brief: string;
  duration_minutes: number;
  status: BookingStatus;
  first_reply_at: string | null;
  accepted_time_id: string | null;
  times: ProposedTime[];
  events: BookingEvent[];
};

// proposed_times is linked twice (request_id and accepted_time_id), so the embed names its key.
const COLS = "id, created_at, lang, profile_id, client_person_id, full_name, email, company, brief, duration_minutes, status, first_reply_at, accepted_time_id, times:proposed_times!proposed_times_request_id_fkey(id, starts_at, proposed_by), events:booking_events(id, at, actor, type, message, time_id)";

function sortInner(b: Booking): Booking {
  b.times.sort((a, c) => a.starts_at.localeCompare(c.starts_at));
  b.events.sort((a, c) => a.at.localeCompare(c.at));
  return b;
}

/** The specialist's own requests, newest first. */
export async function listMyBookings(profileId: string): Promise<Booking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("booking_requests").select(COLS).eq("profile_id", profileId).order("created_at", { ascending: false }).returns<Booking[]>();
  if (error) console.error("bookings:", error.message);
  return (data ?? []).map(sortInner);
}

export type AdminBooking = Booking & {
  profile: { slug: string; domain_id: string; people: { display_name: string } | null };
};

/** Every request in the house, for board and admin. */
export async function listAllBookings(): Promise<AdminBooking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select(`${COLS}, profile:specialist_profiles!profile_id(slug, domain_id, people!person_id(display_name))`)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AdminBooking[]>();
  if (error) console.error("all bookings:", error.message);
  return (data ?? []).map((b) => sortInner(b) as AdminBooking);
}

export type BookingForClient = Booking & {
  specialist: { name: string; slug: string; email: string; lang: string };
};

/** The requester's view, by id and the token from their mail. Service client; the token is the credential. */
export async function loadBookingByToken(id: string, token: string): Promise<BookingForClient | null> {
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{48}$/.test(token)) return null;
  const admin = createAdminClient();
  type Row = Booking & { client_token: string; profile: { slug: string; people: { display_name: string; email: string; lang: string } } };
  const { data, error } = await admin
    .from("booking_requests")
    .select(`${COLS}, client_token, profile:specialist_profiles!profile_id(slug, people!person_id(display_name, email, lang))`)
    .eq("id", id)
    .limit(1)
    .returns<Row[]>();
  if (error) console.error("booking by token:", error.message);
  const row = data?.[0];
  if (!row || row.client_token !== token) return null;
  const { client_token: _t, profile, ...rest } = row;
  void _t;
  return { ...sortInner(rest as Booking), specialist: { name: profile.people.display_name, slug: profile.slug, email: profile.people.email, lang: profile.people.lang } };
}

export function hoursBetween(a: string, b: string) {
  return Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 3_600_000) * 10) / 10;
}

export function statusLabel(status: BookingStatus, labels: Record<string, I18nText>) {
  return labels[status] ?? labels.requested;
}

export function fmtWhen(iso: string, lang: string) {
  return new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(iso));
}
