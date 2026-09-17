import { createPublicClient } from "@/lib/supabase/public";
import type { I18nList, I18nText } from "@/lib/i18n";

export type DomainStatus = "healthy" | "needs" | "full";

export type HouseDomain = {
  id: string;
  sortOrder: number;
  slug: string;
  name: I18nText;
  tagline: I18nText | null;
  blurb: I18nText | null;
  houseDescription: I18nText | null;
  /** Long copy for the domain page; paragraphs separated by a blank line. */
  description: I18nText | null;
  typicalTasks: I18nList;
  skills: I18nList;
  targetSeats: number;
  activeSeats: number;
  openSeats: number;
  status: DomainStatus;
};

export type HouseData = {
  domains: HouseDomain[];
  relationships: [string, string][];
};

type DomainRow = {
  id: string;
  sort_order: number;
  slug: string;
  name: I18nText;
  tagline: I18nText | null;
  blurb: I18nText | null;
  house_description: I18nText | null;
  description: I18nText | null;
  typical_tasks: I18nList;
  skills: I18nList;
  target_seats: number;
};
type StaffingRow = {
  id: string;
  active_seats: number;
  open_seats: number;
  status: DomainStatus;
};
type RelRow = { domain_a: string; domain_b: string };

/** The whole house in one read: domains, staffing and neighbour pairs. */
export async function loadHouse(): Promise<HouseData> {
  const supabase = createPublicClient();
  const [domains, staffing, rels] = await Promise.all([
    supabase
      .from("domains")
      .select("id, sort_order, slug, name, tagline, blurb, house_description, description, typical_tasks, skills, target_seats")
      .order("sort_order")
      .returns<DomainRow[]>(),
    supabase
      .from("domain_staffing")
      .select("id, active_seats, open_seats, status")
      .returns<StaffingRow[]>(),
    supabase
      .from("domain_relationships")
      .select("domain_a, domain_b")
      .returns<RelRow[]>(),
  ]);
  if (domains.error) throw domains.error;
  if (staffing.error) throw staffing.error;
  if (rels.error) throw rels.error;

  const byId = new Map(staffing.data.map((s) => [s.id, s]));
  return {
    domains: domains.data.map((d) => {
      const s = byId.get(d.id);
      return {
        id: d.id,
        sortOrder: d.sort_order,
        slug: d.slug,
        name: d.name,
        tagline: d.tagline,
        blurb: d.blurb,
        houseDescription: d.house_description,
        description: d.description,
        typicalTasks: d.typical_tasks,
        skills: d.skills,
        targetSeats: d.target_seats,
        activeSeats: s?.active_seats ?? 0,
        openSeats: s?.open_seats ?? 0,
        status: s?.status ?? "needs",
      };
    }),
    relationships: rels.data.map((r) => [r.domain_a, r.domain_b]),
  };
}

export async function loadDomainBySlug(slug: string) {
  const house = await loadHouse();
  const domain = house.domains.find((d) => d.slug === slug) ?? null;
  if (!domain) return null;
  const neighbourIds = house.relationships
    .filter(([a, b]) => a === domain.id || b === domain.id)
    .map(([a, b]) => (a === domain.id ? b : a));
  const neighbours = house.domains.filter((d) => neighbourIds.includes(d.id));
  return { domain, neighbours, house };
}

export function neighboursOf(house: HouseData, id: string) {
  const ids = house.relationships
    .filter(([a, b]) => a === id || b === id)
    .map(([a, b]) => (a === id ? b : a));
  return house.domains.filter((d) => ids.includes(d.id));
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}
