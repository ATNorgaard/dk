import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { href, isLang, type Lang } from "@/lib/i18n";

export type Role = "visitor" | "client" | "specialist" | "domain_lead" | "board" | "admin";

export type Membership = {
  id: string;
  role: Role;
  domain_id: string | null;
  organisation_id: string | null;
};

export type Viewer = {
  userId: string;
  email: string | null;
  person: { id: string; displayName: string; lang: Lang } | null;
  roles: Role[];
  memberships: Membership[];
};

type PersonRow = { id: string; display_name: string; lang: string };

/**
 * "Se som": an admin can look at the site as another role. The choice sits
 * in a cookie set by /api/view-as; getViewer applies it, getRealViewer does
 * not. It changes what the pages think the viewer is, not what the database
 * lets the session read: row-level security still sees the admin.
 */
export const VIEW_AS_COOKIE = "tuc-view-as";
export const VIEW_AS_OPTIONS = ["board", "specialist", "client", "visitor"] as const;
export type ViewAs = (typeof VIEW_AS_OPTIONS)[number];
export function isViewAs(v: string | undefined | null): v is ViewAs {
  return !!v && (VIEW_AS_OPTIONS as readonly string[]).includes(v);
}
function applyViewAs(viewer: Viewer | null, view: string | undefined): Viewer | null {
  if (!viewer || !viewer.roles.includes("admin") || !isViewAs(view)) return viewer;
  if (view === "visitor") return null;
  return { ...viewer, roles: [view], memberships: viewer.memberships.filter((m) => m.role === view) };
}

/**
 * The signed-in person, verified against the auth server, plus their active
 * memberships. Memoised per request so layouts, pages and actions can all
 * call it. Null when nobody is signed in. Honours "Se som" (see above).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const [viewer, cookieStore] = await Promise.all([getRealViewer(), cookies()]);
  return applyViewAs(viewer, cookieStore.get(VIEW_AS_COOKIE)?.value);
});

/** The signed-in person as they really are, ignoring "Se som". */
export const getRealViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: people } = await supabase
    .from("people")
    .select("id, display_name, lang")
    .eq("user_id", user.id)
    .limit(1)
    .returns<PersonRow[]>();
  const row = people?.[0];
  const person = row
    ? { id: row.id, displayName: row.display_name, lang: isLang(row.lang) ? row.lang : "da" }
    : null;

  let memberships: Membership[] = [];
  if (person) {
    const { data } = await supabase
      .from("memberships")
      .select("id, role, domain_id, organisation_id")
      .eq("person_id", person.id)
      .eq("status", "active")
      .returns<Membership[]>();
    memberships = data ?? [];
  }
  const roles = Array.from(new Set(memberships.map((m) => m.role)));
  return { userId: user.id, email: user.email ?? null, person, roles, memberships };
});

/** Send a signed-out visitor to the login page and back to `path` afterwards. */
export async function requireViewer(lang: Lang, path: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`${href(lang, "/log-ind")}?next=${encodeURIComponent(path)}`);
  return viewer;
}

/** As requireViewer, and the viewer must hold one of the roles. */
export async function requireRole(lang: Lang, path: string, ...roles: Role[]): Promise<Viewer> {
  const viewer = await requireViewer(lang, path);
  if (!roles.some((r) => viewer.roles.includes(r))) redirect(`${href(lang, "/portal")}?denied=1`);
  return viewer;
}

export function hasRole(viewer: Viewer | null, ...roles: Role[]) {
  return !!viewer && roles.some((r) => viewer.roles.includes(r));
}
