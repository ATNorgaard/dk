import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { loadHouse } from "@/lib/house";
import { overviewCounts } from "@/lib/admin";
import { admin } from "@/content/admin";
import { AdminFrame } from "@/components/admin/AdminFrame";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminOverview({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin");
  const viewer = await requireRole(lang, path, "board", "admin");
  const [counts, house] = await Promise.all([overviewCounts(), loadHouse()]);
  const recruiting = house.domains.filter((d) => d.status === "needs").length;
  const c = admin.overview;

  const stats = [
    { n: counts.newApplications, label: c.newApplications, to: "/admin/ansoegninger?status=received" },
    { n: counts.openContacts, label: c.openContacts, to: "/admin/henvendelser" },
    { n: recruiting, label: c.recruiting, to: "/admin/pladser" },
    { n: counts.people, label: c.people, to: "/admin/personer" },
  ];

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <ul className={a.stats}>
        {stats.map((s) => (
          <li key={s.to}>
            <Link href={href(lang, s.to)}>
              <b>{s.n}</b>
              <span>{t(s.label, lang, "")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminFrame>
  );
}
