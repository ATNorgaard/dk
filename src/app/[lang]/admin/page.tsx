import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadHouse } from "@/lib/house";
import { auth } from "@/content/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { RichTitle } from "@/components/ui/RichTitle";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

type PersonRow = {
  id: string;
  display_name: string;
  email: string;
  user_id: string | null;
  memberships: { role: Role; domain_id: string | null; status: string }[];
};

export default async function AdminPage({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin");
  const viewer = await requireRole(lang, path, "board", "admin");
  const c = auth.admin;

  const supabase = await createClient();
  const [{ data: people }, house] = await Promise.all([
    supabase
      .from("people")
      .select("id, display_name, email, user_id, memberships!person_id(role, domain_id, status)")
      .order("display_name")
      .returns<PersonRow[]>(),
    loadHouse(),
  ]);
  const domainName = (id: string | null) => {
    const d = id ? house.domains.find((x) => x.id === id) : null;
    return d ? t(d.name, lang, d.id) : id ?? "";
  };

  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.wide}>
        <span className="hds-eyebrow">{t(c.eyebrow, lang, "")}</span>
        <h1 className={p.title}>
          <RichTitle text={t(c.title, lang, "")} />
        </h1>
        <p className={p.intro}>{t(c.intro, lang, "")}</p>

        <section className={p.section}>
          <h2>{t(c.peopleTitle, lang, "")}</h2>
          {people?.length ? (
            <div className={p.tableWrap}>
              <table className={p.table}>
                <thead>
                  <tr>
                    <th>{t(c.columns.name, lang, "")}</th>
                    <th>{t(c.columns.email, lang, "")}</th>
                    <th>{t(c.columns.roles, lang, "")}</th>
                    <th>{t(c.columns.signedIn, lang, "")}</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((person) => {
                    const active = person.memberships.filter((m) => m.status === "active");
                    return (
                      <tr key={person.id}>
                        <td>{person.display_name}</td>
                        <td>{person.email}</td>
                        <td>
                          {active.length ? (
                            <ul className={p.tags}>
                              {active.map((m, i) => (
                                <li key={i} className={p.tag} data-heart={m.role === "board" || m.role === "admin"}>
                                  {t(auth.roles[m.role], lang, m.role)}
                                  {m.domain_id ? ` · ${domainName(m.domain_id)}` : ""}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className={p.muted}>–</span>
                          )}
                        </td>
                        <td className={person.user_id ? undefined : p.muted}>
                          {t(person.user_id ? c.linked : c.notLinked, lang, "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>{t(c.peopleEmpty, lang, "")}</p>
          )}
          <p className={p.muted}>{t(c.grantHint, lang, "")}</p>
        </section>

        <section className={p.section}>
          <h2>{t(c.comingTitle, lang, "")}</h2>
          <ul className={p.tiles}>
            {c.coming.map((line) => (
              <li key={line.en}>
                <span>{t(line, lang, "")}</span>
                <small>{t(c.comingTitle, lang, "")}</small>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
