import type { MetadataRoute } from "next";
import { loadHouse } from "@/lib/house";
import { loadTeaserSlugs } from "@/lib/specialists";

const BASE = "https://www.trustusconsult.dk";
const LANGS = ["da", "en"] as const;

/** Every public page in both languages: the fixed pages, the domains, the live specialists. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [house, slugs] = await Promise.all([loadHouse(), loadTeaserSlugs()]);
  const now = new Date();
  const entry = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]): MetadataRoute.Sitemap =>
    LANGS.map((lang) => ({
      url: `${BASE}/${lang}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: { languages: { da: `${BASE}/da${path}`, en: `${BASE}/en${path}` } },
    }));
  return [
    ...entry("", 1, "weekly"),
    ...entry("/freelancere", 0.8, "monthly"),
    ...entry("/privatliv", 0.2, "yearly"),
    ...entry("/vilkaar", 0.2, "yearly"),
    ...house.domains.flatMap((d) => entry(`/domaener/${d.slug}`, 0.7, "weekly")),
    ...slugs.flatMap(({ slug }) => entry(`/specialister/${slug}`, 0.6, "weekly")),
  ];
}
