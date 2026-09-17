import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { listDomainsForAdmin, metricsByDomain } from "@/lib/admin";
import { admin } from "@/content/admin";
import { AdminFrame } from "@/components/admin/AdminFrame";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Tal · Admin", robots: { index: false } };

export default async function NumbersPage({ params }: PageProps<"/[lang]/admin/tal">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/tal");
  const viewer = await requireRole(lang, path, "board", "admin");
  const [domains, sums] = await Promise.all([listDomainsForAdmin(), metricsByDomain(30)]);
  const c = admin.numbers;
  const L = (v: { da: string; en: string }) => t(v, lang, "");
  const total = { domain_views: 0, window_hovers: 0, visitors: 0, contacts: 0, applications: 0 };
  for (const s of sums.values()) {
    total.domain_views += s.domain_views;
    total.window_hovers += s.window_hovers;
    total.visitors += s.visitors;
    total.contacts += s.contacts;
    total.applications += s.applications;
  }

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th>{L(admin.common.domain)}</th>
              <th className={a.num}>{L(c.views)}</th>
              <th className={a.num}>{L(c.hovers)}</th>
              <th className={a.num}>{L(c.visitors)}</th>
              <th className={a.num}>{L(c.contacts)}</th>
              <th className={a.num}>{L(c.applications)}</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((d) => {
              const s = sums.get(d.id);
              return (
                <tr key={d.id}>
                  <td>{t(d.name, lang, d.id)}</td>
                  <td className={a.num}>{s?.domain_views ?? 0}</td>
                  <td className={a.num}>{s?.window_hovers ?? 0}</td>
                  <td className={a.num}>{s?.visitors ?? 0}</td>
                  <td className={a.num}>{s?.contacts ?? 0}</td>
                  <td className={a.num}>{s?.applications ?? 0}</td>
                </tr>
              );
            })}
            <tr>
              <td><b>{L(admin.common.all)}</b></td>
              <td className={a.num}><b>{total.domain_views}</b></td>
              <td className={a.num}><b>{total.window_hovers}</b></td>
              <td className={a.num}><b>{total.visitors}</b></td>
              <td className={a.num}><b>{total.contacts}</b></td>
              <td className={a.num}><b>{total.applications}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminFrame>
  );
}
