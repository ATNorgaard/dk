import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { t, type I18nList, type I18nText, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";

/**
 * Specialists: public teasers through the specialist_teasers view (cookie-less,
 * static pages) and the full profile through the signed-in client (RLS decides
 * whether the viewer may see it: owner, board/admin, or a client of a live one).
 */

export type Teaser = {
  id: string;
  slug: string;
  domain_id: string;
  display_name: string;
  title: I18nText | null;
  tagline: I18nText | null;
  city: string | null;
  years_in_craft: number | null;
  skills: I18nList;
  languages: string[];
  available_from: string | null;
  booked_until: string | null;
  portrait_path: string | null;
  seat_position: number;
};

export type Profile = {
  id: string;
  person_id: string;
  domain_id: string;
  slug: string;
  title: I18nText | null;
  tagline: I18nText | null;
  city: string | null;
  years_in_craft: number | null;
  summary: I18nText | null;
  skills: I18nList;
  languages: string[];
  rate_text: string | null;
  weekly_hours: number | null;
  available_from: string | null;
  booked_until: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  portrait_path: string | null;
  cv_path: string | null;
  is_published: boolean;
};

export type Experience = {
  id: string;
  organisation: string;
  title: I18nText;
  description: I18nText | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};
export type Education = {
  id: string;
  institution: string;
  degree: I18nText;
  start_year: number | null;
  end_year: number | null;
  sort_order: number;
};
export type Certification = { id: string; name: string; issuer: string | null; year: number | null; sort_order: number };

export type FullProfile = {
  profile: Profile;
  displayName: string;
  email: string;
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
};

const TEASER_COLS = "id, slug, domain_id, display_name, title, tagline, city, years_in_craft, skills, languages, available_from, booked_until, portrait_path, seat_position";

/** All live specialists, grouped by domain. Public. */
export async function loadTeasers(): Promise<Map<string, Teaser[]>> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("specialist_teasers").select(TEASER_COLS).order("seat_position").returns<Teaser[]>();
  if (error) console.error("teasers:", error.message);
  const byDomain = new Map<string, Teaser[]>();
  for (const t of data ?? []) byDomain.set(t.domain_id, [...(byDomain.get(t.domain_id) ?? []), t]);
  return byDomain;
}

export async function loadTeaserBySlug(slug: string): Promise<Teaser | null> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("specialist_teasers").select(TEASER_COLS).eq("slug", slug).limit(1).returns<Teaser[]>();
  return data?.[0] ?? null;
}

export async function loadTeaserSlugs(): Promise<{ slug: string }[]> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("specialist_teasers").select("slug").returns<{ slug: string }[]>();
  return data ?? [];
}

/** Public URL of a portrait in the portraits bucket. */
export function portraitUrl(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portraits/${path}`;
}

type ProfileRow = Profile & { people: { display_name: string; email: string } };

/** The full profile the signed-in viewer is allowed to see, by slug or person. Null when not allowed or absent. */
export async function loadFullProfile(where: { slug: string } | { personId: string }): Promise<FullProfile | null> {
  const supabase = await createClient();
  let q = supabase.from("specialist_profiles").select("*, people!person_id(display_name, email)");
  q = "slug" in where ? q.eq("slug", where.slug) : q.eq("person_id", where.personId);
  const { data: rows, error } = await q.limit(1).returns<ProfileRow[]>();
  if (error) console.error("profile:", error.message);
  const row = rows?.[0];
  if (!row) return null;
  const { people, ...profile } = row;
  const [ex, ed, ce] = await Promise.all([
    supabase.from("experience").select("*").eq("profile_id", profile.id).order("sort_order").order("start_date", { ascending: false, nullsFirst: false }).returns<Experience[]>(),
    supabase.from("education").select("*").eq("profile_id", profile.id).order("sort_order").order("end_year", { ascending: false, nullsFirst: false }).returns<Education[]>(),
    supabase.from("certifications").select("*").eq("profile_id", profile.id).order("sort_order").order("year", { ascending: false, nullsFirst: false }).returns<Certification[]>(),
  ]);
  return {
    profile,
    displayName: people.display_name,
    email: people.email,
    experience: ex.data ?? [],
    education: ed.data ?? [],
    certifications: ce.data ?? [],
  };
}

/** Whether the viewer's profile is live: published and holding an active seat. Uses the public view, which applies the rule. */
export async function isLive(profileId: string) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("specialist_teasers").select("id").eq("id", profileId).limit(1).returns<{ id: string }[]>();
  return !!data?.[0];
}

/** Rough completeness for the "85 %" bar: which of the fields that matter are filled. */
export function completeness(p: FullProfile) {
  const checks = [
    !!p.profile.title?.da,
    !!p.profile.tagline?.da,
    !!p.profile.city,
    p.profile.years_in_craft !== null,
    !!p.profile.summary?.da && p.profile.summary.da.length > 80,
    (p.profile.skills?.da?.length ?? 0) >= 3,
    p.profile.languages.length > 0,
    !!p.profile.rate_text,
    p.profile.weekly_hours !== null || !!p.profile.available_from,
    !!p.profile.linkedin_url || !!p.profile.website_url,
    !!p.profile.portrait_path,
    p.experience.length >= 2,
    p.education.length >= 1,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** "Available now", "Available from 1 Oct" or "Fully booked until …", from the two dates. */
export function availabilityLine(te: { available_from: string | null; booked_until: string | null }, lang: Lang) {
  const fmt = (d: string) => new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", { day: "numeric", month: "short" }).format(new Date(d));
  const today = new Date().toISOString().slice(0, 10);
  if (te.booked_until && te.booked_until >= today) return t(specialists.teaser.bookedUntil, lang, "").replace("{date}", fmt(te.booked_until));
  if (te.available_from && te.available_from > today) return t(specialists.teaser.availableFrom, lang, "").replace("{date}", fmt(te.available_from));
  return t(specialists.teaser.availableNow, lang, "");
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "specialist";
}
