"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole, type Role } from "@/lib/auth";
import { href, isLang, type Lang } from "@/lib/i18n";
import { admin } from "@/content/admin";
import { APPLICATION_STATUSES, SEAT_STATUSES, type ApplicationStatus, type SeatStatus } from "@/lib/admin";

/**
 * Writes behind the admin pages. Every action re-checks the role (the
 * database checks again through row-level security), writes as the
 * signed-in user so the audit trigger records who did it, and
 * revalidates the page it came from. Public pages are revalidated when
 * domain copy or seats change.
 */
export type AdminState = { status: "idle" } | { status: "ok"; message?: string } | { status: "error"; message: string };

const ROLES: Role[] = ["client", "specialist", "domain_lead", "board", "admin"];
const DOMAIN_ROLES: Role[] = ["specialist", "domain_lead"];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function opt(fd: FormData, key: string, max = 4000) {
  return str(fd, key, max) || null;
}
function i18n(fd: FormData, key: string, max = 4000) {
  const da = str(fd, `${key}_da`, max);
  const en = str(fd, `${key}_en`, max);
  if (!da && !en) return null;
  return { da: da || en, en: en || da };
}
function lines(fd: FormData, key: string) {
  return str(fd, key, 4000)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}
function dateOrNull(fd: FormData, key: string) {
  const v = str(fd, key, 40);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** lang and the admin path the form lives on, both from hidden fields. */
async function context(fd: FormData, ...roles: Role[]) {
  const l = str(fd, "lang", 2);
  const lang: Lang = isLang(l) ? l : "da";
  const path = str(fd, "path", 200) || href(lang, "/admin");
  const wanted: Role[] = roles.length ? roles : ["board", "admin"];
  const viewer = await requireRole(lang, path, ...wanted);
  return { lang, path, viewer, ok: (): AdminState => ({ status: "ok", message: admin.common.saved[lang] }), fail: (m?: string): AdminState => ({ status: "error", message: m ?? admin.common.failed[lang] }) };
}

function revalidatePublic() {
  revalidatePath("/[lang]", "page");
  revalidatePath("/[lang]/freelancere", "page");
  revalidatePath("/[lang]/domaener/[slug]", "page");
}

/* Applications */

export async function setApplicationStatus(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 20) as ApplicationStatus;
  if (!id || !APPLICATION_STATUSES.includes(status)) return c.fail();
  const supabase = await createClient();
  const decided = status === "accepted" || status === "declined";
  const { error } = await supabase
    .from("applications")
    .update({ status, decided_at: decided ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return c.fail();
  revalidatePath(c.path);
  revalidatePath(href(c.lang, "/admin/ansoegninger"));
  return c.ok();
}

export async function addApplicationNote(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  const body = str(fd, "body", 4000);
  if (!id || !body) return c.fail();
  const supabase = await createClient();
  const { error } = await supabase
    .from("application_notes")
    .insert({ application_id: id, author_person_id: c.viewer.person?.id ?? null, body });
  if (error) return c.fail();
  revalidatePath(c.path);
  return c.ok();
}

/* Enquiries */

export async function setContactHandled(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  const handled = str(fd, "handled", 5) === "1";
  if (!id) return c.fail();
  const supabase = await createClient();
  const patch: Record<string, unknown> = { handled_at: handled ? new Date().toISOString() : null };
  if (fd.has("internal_note")) patch.internal_note = opt(fd, "internal_note", 4000);
  const { error } = await supabase.from("contact_messages").update(patch).eq("id", id);
  if (error) return c.fail();
  revalidatePath(c.path);
  return c.ok();
}

/* Domains */

export async function saveDomain(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  const name = i18n(fd, "name", 120);
  if (!id || !name) return c.fail();
  const slug = str(fd, "slug", 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return c.fail();
  const target = Number(str(fd, "target_seats", 3));
  if (!Number.isInteger(target) || target < 0 || target > 12) return c.fail();
  const override = str(fd, "status_override", 10);
  const supabase = await createClient();
  const { error } = await supabase
    .from("domains")
    .update({
      name,
      slug,
      tagline: i18n(fd, "tagline", 200),
      blurb: i18n(fd, "blurb", 2000),
      house_description: i18n(fd, "house_description", 1000),
      skills: { da: lines(fd, "skills_da"), en: lines(fd, "skills_en") },
      target_seats: target,
      status_override: ["healthy", "needs", "full"].includes(override) ? override : null,
      is_published: fd.get("is_published") === "on",
    })
    .eq("id", id);
  if (error) return c.fail();
  revalidatePath(c.path);
  revalidatePath(href(c.lang, "/admin/domaener"));
  revalidatePublic();
  return c.ok();
}

/* Seats */

export async function addSeats(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const domain_id = str(fd, "domain_id", 40);
  const count = Number(str(fd, "count", 2) || "1");
  const status = (str(fd, "status", 10) || "open") as SeatStatus;
  if (!domain_id || !Number.isInteger(count) || count < 1 || count > 12 || !SEAT_STATUSES.includes(status)) return c.fail();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("seats").select("position").eq("domain_id", domain_id).returns<{ position: number }[]>();
  const taken = new Set((existing ?? []).map((s) => s.position));
  if (taken.size + count > 12) return c.fail(admin.seats.full[c.lang]);
  const rows: { domain_id: string; position: number; status: SeatStatus }[] = [];
  for (let p = 1; rows.length < count && p <= 12; p++) if (!taken.has(p)) rows.push({ domain_id, position: p, status });
  const { error } = await supabase.from("seats").insert(rows);
  if (error) return c.fail();
  revalidatePath(c.path);
  revalidatePublic();
  return c.ok();
}

export async function updateSeat(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 10) as SeatStatus;
  if (!id || !SEAT_STATUSES.includes(status)) return c.fail();
  const supabase = await createClient();

  let holder_person_id: string | null = null;
  const holderEmail = str(fd, "holder_email", 200).toLowerCase();
  if (holderEmail) {
    const { data } = await supabase.from("people").select("id").eq("email", holderEmail).limit(1).returns<{ id: string }[]>();
    if (!data?.[0]) return c.fail(admin.seats.unknownHolder[c.lang]);
    holder_person_id = data[0].id;
  }

  const { error } = await supabase
    .from("seats")
    .update({
      status,
      holder_person_id,
      buy_in_paid_at: dateOrNull(fd, "buy_in_paid_at"),
      notice_given_at: dateOrNull(fd, "notice_given_at"),
      ends_at: str(fd, "ends_at", 10) || null,
      note: i18n(fd, "note", 300),
    })
    .eq("id", id);
  if (error) return c.fail();
  revalidatePath(c.path);
  revalidatePublic();
  return c.ok();
}

export async function removeSeat(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  if (!id) return c.fail();
  const supabase = await createClient();
  // RLS only lets empty open/closed seats go; a refused delete affects zero rows.
  const { data, error } = await supabase.from("seats").delete().eq("id", id).select("id");
  if (error || !data?.length) return c.fail(admin.seats.removeHint[c.lang]);
  revalidatePath(c.path);
  revalidatePublic();
  return c.ok();
}

/* People and roles (admin only; RLS enforces it too) */

async function ensureAuthUser(email: string, meta: { display_name: string; lang: string }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_SECRET_KEY is not set on the server");
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, email_confirm: true, user_metadata: meta }),
  });
  if (created.ok) return ((await created.json()) as { id: string }).id;
  if (created.status !== 422 && created.status !== 400) throw new Error(`create auth user: ${created.status}`);
  // Already registered: an unsent link tells us the id.
  const link = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "magiclink", email }),
  });
  if (!link.ok) throw new Error(`look up auth user: ${link.status}`);
  const j = (await link.json()) as { user?: { id: string }; id?: string };
  const id = j.user?.id ?? j.id;
  if (!id) throw new Error("auth user id missing");
  return id;
}

export async function grantRole(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd, "admin");
  const email = str(fd, "email", 200).toLowerCase();
  const role = str(fd, "role", 20) as Role;
  const domain_id = opt(fd, "domain_id", 40);
  const lang = str(fd, "person_lang", 2) === "en" ? "en" : "da";
  if (!EMAIL.test(email) || !ROLES.includes(role)) return c.fail();
  if (DOMAIN_ROLES.includes(role) && !domain_id) return c.fail(admin.people.domainRequired[c.lang]);
  if (!DOMAIN_ROLES.includes(role) && domain_id) return c.fail(admin.people.noDomain[c.lang]);

  const supabase = await createClient();
  type P = { id: string; display_name: string; lang: string; user_id: string | null };
  const { data: found } = await supabase.from("people").select("id, display_name, lang, user_id").eq("email", email).limit(1).returns<P[]>();
  let person = found?.[0] ?? null;
  const name = str(fd, "display_name", 120);
  if (!person) {
    const { data, error } = await supabase
      .from("people")
      .insert({ email, display_name: name || email.split("@")[0], lang })
      .select("id, display_name, lang, user_id")
      .returns<P[]>();
    if (error || !data?.[0]) return c.fail();
    person = data[0];
  } else if (name && name !== person.display_name) {
    await supabase.from("people").update({ display_name: name }).eq("id", person.id);
  }

  try {
    const userId = await ensureAuthUser(email, { display_name: person.display_name, lang: person.lang });
    if (!person.user_id) await supabase.from("people").update({ user_id: userId }).eq("id", person.id).is("user_id", null);
  } catch (e) {
    console.error("grantRole: auth user", e);
    return c.fail();
  }

  type M = { id: string };
  let q = supabase.from("memberships").select("id").eq("person_id", person.id).eq("role", role);
  q = domain_id ? q.eq("domain_id", domain_id) : q.is("domain_id", null);
  const { data: existing } = await q.limit(1).returns<M[]>();
  const { error } = existing?.[0]
    ? await supabase.from("memberships").update({ status: "active" }).eq("id", existing[0].id)
    : await supabase
        .from("memberships")
        .insert({ person_id: person.id, role, domain_id, status: "active", granted_by: c.viewer.person?.id ?? null });
  if (error) return c.fail();
  revalidatePath(c.path);
  return c.ok();
}

export async function revokeRole(_prev: AdminState, fd: FormData): Promise<AdminState> {
  const c = await context(fd, "admin");
  const id = str(fd, "membership_id", 40);
  if (!id) return c.fail();
  const supabase = await createClient();
  const { error } = await supabase.from("memberships").update({ status: "revoked" }).eq("id", id);
  if (error) return c.fail();
  revalidatePath(c.path);
  return c.ok();
}
