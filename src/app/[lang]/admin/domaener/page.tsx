import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { listDomainsForAdmin } from "@/lib/admin";
import { loadHouse, pad2 } from "@/lib/house";
import { admin } from "@/content/admin";
import { site } from "@/content/site";
import { AdminFrame } from "@/components/admin/AdminFrame";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Domæner · Admin", robots: { index: false } };

export default async function DomainsPage({ params }: PageProps<"/[lang]/admin/domaener">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/domaener");
  const viewer = await requireRole(lang, path, "board", "admin");
  const [domains, house] = await Promise.all([listDomainsForAdmin(), loadHouse()]);
  const c = admin.domains;

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <div>
        {domains.map((d) => {
          const h = house.domains.find((x) => x.id === d.id);
          return (
            <div key={d.id} className={a.domainRow}>
              <b>{pad2(d.sort_order)}</b>
              <span>
                <Link href={`${path}/${d.id}`}>{t(d.name, lang, d.id)}</Link>
                <span className={a.muted}>
                  {" · "}
                  {h ? t(site.status[h.status], lang, h.status) : ""}
                  {h ? ` · ${h.activeSeats}/${d.target_seats}` : ""}
                  {d.is_published ? "" : ` · ${lang === "da" ? "skjult" : "hidden"}`}
                </span>
              </span>
              <Link href={`${path}/${d.id}`}>{t(c.edit, lang, "")} →</Link>
            </div>
          );
        })}
      </div>
    </AdminFrame>
  );
}
