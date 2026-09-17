import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireViewer } from "@/lib/auth";
import { loadHouse } from "@/lib/house";
import { auth } from "@/content/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Portal", robots: { index: false } };

export default async function PortalPage({ params, searchParams }: PageProps<"/[lang]/portal">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/portal");
  const viewer = await requireViewer(lang, path);
  const sp = await searchParams;
  const house = await loadHouse();
  const domainName = (id: string | null) => {
    const d = id ? house.domains.find((x) => x.id === id) : null;
    return d ? t(d.name, lang, d.id) : null;
  };
  const c = auth.portal;
  const name = viewer.person?.displayName ?? viewer.email ?? "";

  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.wide}>
        {sp.denied ? <p className={p.notice} role="status">{t(c.denied, lang, "")}</p> : null}
        <span className="hds-eyebrow">{t(c.eyebrow, lang, "")}</span>
        <h1 className={p.title}>{t(c.hello, lang, "").replace("{name}", name)}</h1>

        <dl className={p.meta}>
          <div>
            <dt>{t(c.signedInAs, lang, "")}</dt>
            <dd>{viewer.email}</dd>
          </div>
          <div>
            <dt>{t(c.yourRoles, lang, "")}</dt>
            <dd>
              {viewer.memberships.length ? (
                <ul className={p.tags}>
                  {viewer.memberships.map((m) => (
                    <li key={m.id} className={p.tag} data-heart={m.role === "board" || m.role === "admin"}>
                      {t(auth.roles[m.role], lang, m.role)}
                      {m.domain_id ? ` · ${domainName(m.domain_id)}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>{t(c.noRoles, lang, "")}</span>
              )}
            </dd>
          </div>
        </dl>

        <section className={p.section}>
          <h2>{t(c.comingTitle, lang, "")}</h2>
          <ul className={p.list}>
            {c.coming.map((line) => (
              <li key={line.en}>{t(line, lang, "")}</li>
            ))}
          </ul>
        </section>
      </div>
    </PortalShell>
  );
}
