"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { href, isLang, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";
import { admin } from "@/content/admin";
import type { AdminState } from "@/app/actions/admin";

/**
 * A specialist editing their own profile on Min side. Every action loads
 * the viewer's profile through row-level security (owner only), writes,
 * and revalidates Min side and the public pages. The shape of the state
 * matches the admin actions so ActionForm serves both.
 */
type State = AdminState;

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
function lines(fd: FormData, key: string, cap = 40) {
  return str(fd, key, 4000).split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, cap);
}
function int(fd: FormData, key: string, min: number, max: number) {
  const v = str(fd, key, 6);
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

async function context(fd: FormData) {
  const l = str(fd, "lang", 2);
  const lang: Lang = isLang(l) ? l : "da";
  const path = str(fd, "path", 200) || href(lang, "/portal/min-side");
  const viewer = await requireViewer(lang, path);
  const supabase = await createClient();
  const { data } = await supabase
    .from("specialist_profiles")
    .select("id, slug, domain_id")
    .eq("person_id", viewer.person?.id ?? "")
    .limit(1)
    .returns<{ id: string; slug: string; domain_id: string }[]>();
  const profile = data?.[0] ?? null;
  const done = (): State => {
    revalidatePath(path);
    revalidatePath("/[lang]", "page");
    revalidatePath("/[lang]/domaener/[slug]", "page");
    revalidatePath("/[lang]/specialister/[slug]", "page");
    return { status: "ok", message: admin.common.saved[lang] };
  };
  const fail = (m?: string): State => ({ status: "error", message: m ?? admin.common.failed[lang] });
  return { lang, path, viewer, supabase, profile, done, fail };
}

export async function saveBasics(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const { error } = await c.supabase
    .from("specialist_profiles")
    .update({
      title: i18n(fd, "title", 120),
      tagline: i18n(fd, "tagline", 160),
      city: opt(fd, "city", 80),
      years_in_craft: int(fd, "years_in_craft", 0, 60),
    })
    .eq("id", c.profile.id);
  return error ? c.fail() : c.done();
}

export async function saveAbout(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const { error } = await c.supabase
    .from("specialist_profiles")
    .update({
      summary: i18n(fd, "summary", 4000),
      skills: { da: lines(fd, "skills_da"), en: lines(fd, "skills_en") },
      languages: str(fd, "languages", 200).toLowerCase().split(/[,\s]+/).filter((x) => /^[a-z]{2}$/.test(x)).slice(0, 10),
    })
    .eq("id", c.profile.id);
  return error ? c.fail() : c.done();
}

export async function saveAvailability(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const { error } = await c.supabase
    .from("specialist_profiles")
    .update({
      rate_text: opt(fd, "rate_text", 120),
      weekly_hours: int(fd, "weekly_hours", 0, 60),
      available_from: opt(fd, "available_from", 10),
      booked_until: opt(fd, "booked_until", 10),
    })
    .eq("id", c.profile.id);
  return error ? c.fail() : c.done();
}

export async function saveLinks(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const website = opt(fd, "website_url", 300);
  const linkedin = opt(fd, "linkedin_url", 300);
  const slug = str(fd, "slug", 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug || slug.length < 3) return c.fail();
  const { error } = await c.supabase
    .from("specialist_profiles")
    .update({
      website_url: website && /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : null,
      linkedin_url: linkedin && /^https?:\/\//i.test(linkedin) ? linkedin : linkedin ? `https://${linkedin}` : null,
      slug,
    })
    .eq("id", c.profile.id);
  return error ? c.fail() : c.done();
}

export async function setPublished(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const { error } = await c.supabase
    .from("specialist_profiles")
    .update({ is_published: str(fd, "is_published", 5) === "1" })
    .eq("id", c.profile.id);
  return error ? c.fail() : c.done();
}

/** Called after the browser uploaded the file to the portraits bucket. */
export async function setPortrait(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const path = opt(fd, "portrait_path", 300);
  if (path && !path.startsWith(`${c.viewer.person?.id}/`)) return c.fail();
  const { error } = await c.supabase.from("specialist_profiles").update({ portrait_path: path }).eq("id", c.profile.id);
  return error ? c.fail() : c.done();
}

/* Experience */

export async function saveExperience(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const id = opt(fd, "id", 40);
  const organisation = str(fd, "organisation", 160);
  const title = i18n(fd, "title", 160);
  if (!organisation || !title) return c.fail();
  const row = {
    profile_id: c.profile.id,
    organisation,
    title,
    description: i18n(fd, "description", 2000),
    start_date: opt(fd, "start_date", 10),
    end_date: opt(fd, "end_date", 10),
  };
  const { error } = id
    ? await c.supabase.from("experience").update(row).eq("id", id)
    : await c.supabase.from("experience").insert(row);
  return error ? c.fail() : c.done();
}

export async function removeExperience(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  if (!c.profile || !id) return c.fail();
  const { error } = await c.supabase.from("experience").delete().eq("id", id);
  return error ? c.fail() : c.done();
}

/* Education */

export async function saveEducation(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const id = opt(fd, "id", 40);
  const institution = str(fd, "institution", 160);
  const degree = i18n(fd, "degree", 160);
  if (!institution || !degree) return c.fail();
  const row = { profile_id: c.profile.id, institution, degree, start_year: int(fd, "start_year", 1950, 2100), end_year: int(fd, "end_year", 1950, 2100) };
  const { error } = id
    ? await c.supabase.from("education").update(row).eq("id", id)
    : await c.supabase.from("education").insert(row);
  return error ? c.fail() : c.done();
}

export async function removeEducation(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  if (!c.profile || !id) return c.fail();
  const { error } = await c.supabase.from("education").delete().eq("id", id);
  return error ? c.fail() : c.done();
}

/* Certifications */

export async function saveCertification(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const id = opt(fd, "id", 40);
  const name = str(fd, "name", 160);
  if (!name) return c.fail();
  const row = { profile_id: c.profile.id, name, issuer: opt(fd, "issuer", 160), year: int(fd, "year", 1950, 2100) };
  const { error } = id
    ? await c.supabase.from("certifications").update(row).eq("id", id)
    : await c.supabase.from("certifications").insert(row);
  return error ? c.fail() : c.done();
}

export async function removeCertification(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  const id = str(fd, "id", 40);
  if (!c.profile || !id) return c.fail();
  const { error } = await c.supabase.from("certifications").delete().eq("id", id);
  return error ? c.fail() : c.done();
}

/**
 * Apply a CV-import proposal the specialist approved. Fills empty profile
 * fields and appends CV rows; it never overwrites what is already there.
 */
export type ImportProposal = {
  title?: { da: string; en: string };
  tagline?: { da: string; en: string };
  city?: string;
  years_in_craft?: number;
  summary?: { da: string; en: string };
  skills?: { da: string[]; en: string[] };
  languages?: string[];
  experience?: { organisation: string; title: { da: string; en: string }; description?: { da: string; en: string }; start_date?: string; end_date?: string }[];
  education?: { institution: string; degree: { da: string; en: string }; start_year?: number; end_year?: number }[];
  certifications?: { name: string; issuer?: string; year?: number }[];
};

export async function applyImport(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  let proposal: ImportProposal;
  try {
    proposal = JSON.parse(str(fd, "proposal", 60000)) as ImportProposal;
  } catch {
    return c.fail();
  }
  type Cur = { title: unknown; tagline: unknown; city: string | null; years_in_craft: number | null; summary: unknown; skills: { da: string[] }; languages: string[] };
  const { data: cur } = await c.supabase.from("specialist_profiles").select("title, tagline, city, years_in_craft, summary, skills, languages").eq("id", c.profile.id).limit(1).returns<Cur[]>();
  const p = cur?.[0];
  if (!p) return c.fail();
  const patch: Record<string, unknown> = {};
  if (!p.title && proposal.title) patch.title = proposal.title;
  if (!p.tagline && proposal.tagline) patch.tagline = proposal.tagline;
  if (!p.city && proposal.city) patch.city = proposal.city.slice(0, 80);
  if (p.years_in_craft === null && typeof proposal.years_in_craft === "number") patch.years_in_craft = Math.min(60, Math.max(0, Math.round(proposal.years_in_craft)));
  if (!p.summary && proposal.summary) patch.summary = proposal.summary;
  if (!(p.skills?.da?.length) && proposal.skills) patch.skills = { da: proposal.skills.da.slice(0, 40), en: proposal.skills.en.slice(0, 40) };
  if (!p.languages?.length && proposal.languages) patch.languages = proposal.languages.filter((x) => /^[a-z]{2}$/.test(x)).slice(0, 10);
  if (Object.keys(patch).length) {
    const { error } = await c.supabase.from("specialist_profiles").update(patch).eq("id", c.profile.id);
    if (error) return c.fail();
  }
  const pid = c.profile.id;
  if (proposal.experience?.length) {
    await c.supabase.from("experience").insert(proposal.experience.slice(0, 20).map((e, i) => ({ profile_id: pid, organisation: e.organisation.slice(0, 160), title: e.title, description: e.description ?? null, start_date: e.start_date ?? null, end_date: e.end_date ?? null, sort_order: i })));
  }
  if (proposal.education?.length) {
    await c.supabase.from("education").insert(proposal.education.slice(0, 10).map((e, i) => ({ profile_id: pid, institution: e.institution.slice(0, 160), degree: e.degree, start_year: e.start_year ?? null, end_year: e.end_year ?? null, sort_order: i })));
  }
  if (proposal.certifications?.length) {
    await c.supabase.from("certifications").insert(proposal.certifications.slice(0, 20).map((e, i) => ({ profile_id: pid, name: e.name.slice(0, 160), issuer: e.issuer ?? null, year: e.year ?? null, sort_order: i })));
  }
  c.done();
  return { status: "ok", message: specialists.minSide.importApplied[c.lang] };
}
