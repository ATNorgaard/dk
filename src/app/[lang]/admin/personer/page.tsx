import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { hasRole, requireRole, type Role } from "@/lib/auth";
import { listDomainsForAdmin, listPeople } from "@/lib/admin";
import { admin } from "@/content/admin";
import { auth } from "@/content/auth";
import { grantRole, revokeRole } from "@/app/actions/admin";
import { AdminFrame, domainName } from "@/components/admin/AdminFrame";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Personer · Admin", robots: { index: false } };

const GRANTABLE: Role[] = ["client", "specialist", "domain_lead", "board", "admin"];

export default async function PeoplePage({ params }: PageProps<"/[lang]/admin/personer">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/personer");
  const viewer = await requireRole(lang, path, "board", "admin");
  const isAdmin = hasRole(viewer, "admin");
  const [people, domains] = await Promise.all([listPeople(), listDomainsForAdmin()]);
  const c = admin.people;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th>{L(admin.common.name)}</th>
              <th>{L(admin.common.email)}</th>
              <th>{L(c.role)}</th>
              <th>{L(c.account)}</th>
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
                        {active.map((m) => (
                          <li key={m.id} className={p.tag} data-heart={m.role === "board" || m.role === "admin"}>
                            {t(auth.roles[m.role], lang, m.role)}
                            {m.domain_id ? ` · ${domainName(domains, m.domain_id, lang)}` : ""}
                            {isAdmin ? (
                              <ActionForm action={revokeRole} lang={lang} path={path} submit="×" confirm={`${L(c.revoke)} ${t(auth.roles[m.role], lang, m.role)} – ${person.display_name}?`} inline className={a.tagAction}>
                                <input type="hidden" name="membership_id" value={m.id} />
                              </ActionForm>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className={a.muted}>–</span>
                    )}
                  </td>
                  <td className={person.user_id ? undefined : a.muted}>{L(person.user_id ? c.linked : c.notLinked)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className={p.section}>
        <h2>{L(c.grant)}</h2>
        {isAdmin ? (
          <ActionForm action={grantRole} lang={lang} path={path} submit={L(c.grant)} pending={L(admin.common.saving)}>
            <div className={a.grid2}>
              <label className={a.field}>
                <span>{L(admin.common.email)}</span>
                <input name="email" type="email" required autoComplete="off" />
              </label>
              <label className={a.field}>
                <span>{L(admin.common.name)}</span>
                <input name="display_name" autoComplete="off" />
              </label>
              <label className={a.field}>
                <span>{L(c.role)}</span>
                <select name="role" defaultValue="client">
                  {GRANTABLE.map((r) => (
                    <option key={r} value={r}>{t(auth.roles[r], lang, r)}</option>
                  ))}
                </select>
              </label>
              <label className={a.field}>
                <span>{L(admin.common.domain)}</span>
                <select name="domain_id" defaultValue="">
                  <option value="">–</option>
                  {domains.map((d) => (
                    <option key={d.id} value={d.id}>{t(d.name, lang, d.id)}</option>
                  ))}
                </select>
              </label>
              <label className={a.field}>
                <span>{L(admin.common.language)}</span>
                <select name="person_lang" defaultValue="da">
                  <option value="da">{L(admin.common.da)}</option>
                  <option value="en">{L(admin.common.en)}</option>
                </select>
              </label>
            </div>
          </ActionForm>
        ) : (
          <p className={a.hint}>{L(c.adminOnly)}</p>
        )}
      </section>
    </AdminFrame>
  );
}
