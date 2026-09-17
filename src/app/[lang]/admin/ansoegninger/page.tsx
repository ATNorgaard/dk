import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { APPLICATION_STATUSES, listApplications, listDomainsForAdmin, type ApplicationStatus } from "@/lib/admin";
import { admin } from "@/content/admin";
import { AdminFrame, domainName, fmtDate } from "@/components/admin/AdminFrame";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Ansøgninger · Admin", robots: { index: false } };

export default async function ApplicationsPage({ params, searchParams }: PageProps<"/[lang]/admin/ansoegninger">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/ansoegninger");
  const viewer = await requireRole(lang, path, "board", "admin");
  const sp = await searchParams;
  const filter = APPLICATION_STATUSES.includes(sp.status as ApplicationStatus) ? (sp.status as ApplicationStatus) : undefined;
  const [rows, domains] = await Promise.all([listApplications(filter), listDomainsForAdmin()]);
  const c = admin.applications;

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <div className={a.filters}>
        <span className={a.muted}>{t(c.filter, lang, "")}:</span>
        <Link href={path} aria-current={!filter ? "true" : undefined}>{t(admin.common.all, lang, "")}</Link>
        {APPLICATION_STATUSES.map((s) => (
          <Link key={s} href={`${path}?status=${s}`} aria-current={filter === s ? "true" : undefined}>
            {t(c.status[s], lang, s)}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={a.hint}>{t(admin.common.none, lang, "")}</p>
      ) : (
        <div>
          {rows.map((r) => (
            <article key={r.id} className={a.card}>
              <div className={a.cardHead}>
                <h3>
                  <Link href={`${path}/${r.id}`}>{r.full_name}</Link>
                </h3>
                <span className={p.tag}>{t(c.status[r.status], lang, r.status)}</span>
              </div>
              <p className={a.meta}>
                {r.domain_id ? domainName(domains, r.domain_id, lang) : r.craft}
                {r.years_in_craft !== null ? ` · ${r.years_in_craft} ${lang === "da" ? "år" : "years"}` : ""}
                {` · ${r.email} · ${fmtDate(r.created_at, lang, false)}`}
              </p>
            </article>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
