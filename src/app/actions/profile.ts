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
function url(value: string | null) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}
/** Indices present for a list posted as `<prefix>.<i>.<field>`, in order. */
function indices(fd: FormData, prefix: string, cap: number) {
  const found = new Set<number>();
  for (const key of fd.keys()) {
    const m = key.match(new RegExp(`^${prefix}\\.(\\d+)\\.`));
    if (m) found.add(Number(m[1]));
  }
  return [...found].sort((x, y) => x - y).slice(0, cap);
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

/**
 * The whole editor in one save: every profile column, then the three CV
 * lists replaced by what was posted (`experience.<i>.<field>` and so on).
 * Rows without the one thing that names them (organisation, institution,
 * certification name) are dropped rather than failing the save, so an
 * added-but-empty row just disappears.
 */
export async function saveProfile(_p: State, fd: FormData): Promise<State> {
  const c = await context(fd);
  if (!c.profile) return c.fail();
  const pid = c.profile.id;

  const slug = str(fd, "slug", 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (slug.length < 3) return c.fail(specialists.minSide.slugInvalid[c.lang]);

  const { error } = await c.supabase
    .from("specialist_profiles")
    .update({
      title: i18n(fd, "title", 120),
      tagline: i18n(fd, "tagline", 160),
      city: opt(fd, "city", 80),
      years_in_craft: int(fd, "years_in_craft", 0, 60),
      summary: i18n(fd, "summary", 4000),
      skills: { da: lines(fd, "skills_da"), en: lines(fd, "skills_en") },
      languages: str(fd, "languages", 200).toLowerCase().split(/[,\s]+/).filter((x) => /^[a-z]{2}$/.test(x)).slice(0, 10),
      rate_text: opt(fd, "rate_text", 120),
      weekly_hours: int(fd, "weekly_hours", 0, 60),
      available_from: opt(fd, "available_from", 10),
      booked_until: opt(fd, "booked_until", 10),
      website_url: url(opt(fd, "website_url", 300)),
      linkedin_url: url(opt(fd, "linkedin_url", 300)),
      slug,
    })
    .eq("id", pid);
  if (error) return c.fail(error.code === "23505" ? specialists.minSide.slugTaken[c.lang] : undefined);

  const experience = indices(fd, "experience", 20)
    .map((i, n) => ({
      profile_id: pid,
      organisation: str(fd, `experience.${i}.organisation`, 160),
      title: i18n(fd, `experience.${i}.title`, 160),
      description: i18n(fd, `experience.${i}.description`, 2000),
      start_date: opt(fd, `experience.${i}.start_date`, 10),
      end_date: opt(fd, `experience.${i}.end_date`, 10),
      sort_order: n,
    }))
    .filter((r) => r.organisation && r.title)
    .map((r) => ({ ...r, title: r.title! }));
  const education = indices(fd, "education", 10)
    .map((i, n) => ({
      profile_id: pid,
      institution: str(fd, `education.${i}.institution`, 160),
      degree: i18n(fd, `education.${i}.degree`, 160),
      start_year: int(fd, `education.${i}.start_year`, 1950, 2100),
      end_year: int(fd, `education.${i}.end_year`, 1950, 2100),
      sort_order: n,
    }))
    .filter((r) => r.institution && r.degree)
    .map((r) => ({ ...r, degree: r.degree! }));
  const certifications = indices(fd, "certifications", 20)
    .map((i, n) => ({
      profile_id: pid,
      name: str(fd, `certifications.${i}.name`, 160),
      issuer: opt(fd, `certifications.${i}.issuer`, 160),
      year: int(fd, `certifications.${i}.year`, 1950, 2100),
      sort_order: n,
    }))
    .filter((r) => r.name);

  // Replace each list. The ids are referenced nowhere else, so new ids on
  // every save cost nothing, and it keeps the order exactly as posted.
  const steps = [
    () => c.supabase.from("experience").delete().eq("profile_id", pid),
    () => (experience.length ? c.supabase.from("experience").insert(experience) : null),
    () => c.supabase.from("education").delete().eq("profile_id", pid),
    () => (education.length ? c.supabase.from("education").insert(education) : null),
    () => c.supabase.from("certifications").delete().eq("profile_id", pid),
    () => (certifications.length ? c.supabase.from("certifications").insert(certifications) : null),
  ];
  for (const step of steps) {
    const r = await step();
    if (r?.error) return c.fail();
  }
  return c.done();
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
