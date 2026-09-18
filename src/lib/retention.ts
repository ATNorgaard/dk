import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Retention: what the house deletes, and when. The periods are the ones
 * the privacy notice states (src/content/legal.ts); change both together.
 * Run daily by /api/cron/retention. Every rule reads its candidates first,
 * so a dry run reports exactly what a real run would remove.
 */
export const RETENTION = {
  /** Contact-form enquiries, after they were sent. */
  contactMonths: 12,
  /** Declined applications, after the decision. */
  declinedApplicationMonths: 6,
  /** Access requests: declined ones after the decision, unanswered ones after arrival. */
  accessRequestDays: 90,
  /** Meeting requests, after the agreed time, or the last proposed one. */
  bookingMonths: 12,
  /** A departed specialist's profile and files, after the membership was revoked. */
  departedProfileDays: 30,
  /** Client accounts, after the last sign-in (or after creation, if never signed in). */
  clientAccountMonths: 12,
  /** Rate-limit rows; the function trims these too. */
  rateEventDays: 2,
} as const;

export type RetentionReport = Record<string, { candidates: number; deleted: number }>;

const monthsAgo = (n: number) => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString(); };
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

async function deleteByIds(admin: SupabaseClient, table: string, ids: string[], dry: boolean) {
  if (dry || !ids.length) return 0;
  let n = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await admin.from(table).delete().in("id", chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
    n += chunk.length;
  }
  return n;
}

async function removeFolder(admin: SupabaseClient, bucket: string, folder: string, dry: boolean) {
  const { data } = await admin.storage.from(bucket).list(folder, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${folder}/${f.name}`);
  if (!dry && paths.length) await admin.storage.from(bucket).remove(paths);
  return paths.length;
}

export async function runRetention(admin: SupabaseClient, dry: boolean): Promise<RetentionReport> {
  const report: RetentionReport = {};
  const note = (key: string, candidates: number, deleted: number) => { report[key] = { candidates, deleted }; };

  // 1. Contact-form enquiries.
  {
    const { data } = await admin.from("contact_messages").select("id").lt("created_at", monthsAgo(RETENTION.contactMonths)).returns<{ id: string }[]>();
    const ids = (data ?? []).map((r) => r.id);
    note("contact_messages", ids.length, await deleteByIds(admin, "contact_messages", ids, dry));
  }

  // 2. Declined applications, with their notes.
  {
    const cutoff = monthsAgo(RETENTION.declinedApplicationMonths);
    const { data } = await admin.from("applications").select("id, decided_at, updated_at").eq("status", "declined").returns<{ id: string; decided_at: string | null; updated_at: string }[]>();
    const ids = (data ?? []).filter((r) => (r.decided_at ?? r.updated_at) < cutoff).map((r) => r.id);
    if (!dry && ids.length) await admin.from("application_notes").delete().in("application_id", ids);
    note("applications_declined", ids.length, await deleteByIds(admin, "applications", ids, dry));
  }

  // 3. Access requests: declined after the decision, never answered after arrival.
  {
    const cutoff = daysAgo(RETENTION.accessRequestDays);
    const { data } = await admin.from("access_requests").select("id, status, decided_at, created_at").in("status", ["declined", "received"]).returns<{ id: string; status: string; decided_at: string | null; created_at: string }[]>();
    const ids = (data ?? []).filter((r) => (r.status === "declined" ? (r.decided_at ?? r.created_at) : r.created_at) < cutoff).map((r) => r.id);
    note("access_requests", ids.length, await deleteByIds(admin, "access_requests", ids, dry));
  }

  // 4. Meeting requests, twelve months after the agreed or last proposed time.
  {
    const cutoff = monthsAgo(RETENTION.bookingMonths);
    const { data } = await admin.from("booking_requests").select("id, created_at, accepted_time_id").lt("created_at", cutoff).returns<{ id: string; created_at: string; accepted_time_id: string | null }[]>();
    const ids: string[] = [];
    for (const r of data ?? []) {
      const { data: times } = await admin.from("proposed_times").select("id, starts_at").eq("request_id", r.id).returns<{ id: string; starts_at: string }[]>();
      const agreed = times?.find((t) => t.id === r.accepted_time_id)?.starts_at;
      const last = agreed ?? [r.created_at, ...(times ?? []).map((t) => t.starts_at)].sort().at(-1)!;
      if (last < cutoff) ids.push(r.id);
    }
    if (!dry && ids.length) {
      await admin.from("booking_events").delete().in("request_id", ids);
      await admin.from("proposed_times").delete().in("request_id", ids);
    }
    note("booking_requests", ids.length, await deleteByIds(admin, "booking_requests", ids, dry));
  }

  // 5. Departed specialists: profile and files once the membership has been revoked long enough;
  //    the person too, when nothing else keeps them.
  {
    const cutoff = daysAgo(RETENTION.departedProfileDays);
    const { data: revoked } = await admin.from("memberships").select("person_id, updated_at").eq("role", "specialist").eq("status", "revoked").lt("updated_at", cutoff).returns<{ person_id: string; updated_at: string }[]>();
    const persons = [...new Set((revoked ?? []).map((r) => r.person_id))];
    let profiles = 0, files = 0, people = 0, deletedProfiles = 0, deletedPeople = 0;
    for (const pid of persons) {
      const { data: live } = await admin.from("memberships").select("id, role").eq("person_id", pid).in("status", ["active", "invited"]).returns<{ id: string; role: string }[]>();
      if ((live ?? []).some((m) => m.role === "specialist")) continue; // re-admitted
      const { data: prof } = await admin.from("specialist_profiles").select("id").eq("person_id", pid).returns<{ id: string }[]>();
      if (prof?.length) {
        profiles++;
        files += await removeFolder(admin, "portraits", pid, dry);
        files += await removeFolder(admin, "cvs", pid, dry);
        deletedProfiles += await deleteByIds(admin, "specialist_profiles", prof.map((p) => p.id), dry);
      }
      if (!(live ?? []).length) {
        people++;
        deletedPeople += await deletePerson(admin, pid, dry);
      }
    }
    note("departed_profiles", profiles, deletedProfiles);
    note("departed_files", files, dry ? 0 : files);
    note("departed_people", people, deletedPeople);
  }

  // 6. Client accounts twelve months after the last sign-in.
  {
    const cutoff = monthsAgo(RETENTION.clientAccountMonths);
    const { data: clients } = await admin.from("memberships").select("person_id").eq("role", "client").eq("status", "active").returns<{ person_id: string }[]>();
    const candidates: string[] = [];
    for (const pid of [...new Set((clients ?? []).map((c) => c.person_id))]) {
      const { data: others } = await admin.from("memberships").select("id").eq("person_id", pid).in("status", ["active", "invited"]).neq("role", "client").returns<{ id: string }[]>();
      if (others?.length) continue; // also a specialist or board member
      const { data: person } = await admin.from("people").select("user_id, created_at").eq("id", pid).returns<{ user_id: string | null; created_at: string }[]>();
      const p = person?.[0];
      if (!p) continue;
      let lastSeen = p.created_at;
      if (p.user_id) {
        const { data: u } = await admin.auth.admin.getUserById(p.user_id);
        lastSeen = u?.user?.last_sign_in_at ?? p.created_at;
      }
      if (lastSeen < cutoff) candidates.push(pid);
    }
    let deleted = 0;
    for (const pid of candidates) deleted += await deletePerson(admin, pid, dry);
    note("client_accounts", candidates.length, deleted);
  }

  // 7. Rate-limit rows (the SQL function trims these too; this keeps the table small between calls).
  {
    const { data } = await admin.from("rate_events").select("id").lt("at", daysAgo(RETENTION.rateEventDays)).returns<{ id: string }[]>();
    const ids = (data ?? []).map((r) => String(r.id));
    note("rate_events", ids.length, await deleteByIds(admin, "rate_events", ids, dry));
  }

  return report;
}

/** The person row (memberships and notes cascade) and the auth account behind it. */
async function deletePerson(admin: SupabaseClient, personId: string, dry: boolean) {
  if (dry) return 0;
  const { data } = await admin.from("people").select("user_id").eq("id", personId).returns<{ user_id: string | null }[]>();
  const userId = data?.[0]?.user_id ?? null;
  const { error } = await admin.from("people").delete().eq("id", personId);
  if (error) throw new Error(`people: ${error.message}`);
  if (userId) await admin.auth.admin.deleteUser(userId);
  return 1;
}
