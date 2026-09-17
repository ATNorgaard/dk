import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t, type I18nText } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { fmtWhen, hoursBetween, listAllBookings } from "@/lib/bookings";
import { listDomainsForAdmin } from "@/lib/admin";
import { bookings } from "@/content/bookings";
import { admin } from "@/content/admin";
import { AdminFrame, domainName } from "@/components/admin/AdminFrame";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Møder · Admin", robots: { index: false } };

export default async function BookingsAdminPage({ params }: PageProps<"/[lang]/admin/bookinger">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/bookinger");
  const viewer = await requireRole(lang, path, "board", "admin");
  const [rows, domains] = await Promise.all([listAllBookings(), listDomainsForAdmin()]);
  const c = bookings.admin;
  const L = (v: I18nText) => t(v, lang, "");
  const replied = rows.filter((r) => r.first_reply_at).map((r) => hoursBetween(r.created_at, r.first_reply_at!)).sort((x, y) => x - y);
  const median = replied.length ? replied[Math.floor(replied.length / 2)] : null;
  const open = rows.filter((r) => r.status === "requested" || r.status === "proposed").length;

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <ul className={a.stats}>
        <li><b>{open}</b><span>{L(c.openCount)}</span></li>
        <li><b>{median === null ? "–" : L(c.hours).replace("{n}", String(median))}</b><span>{L(c.medianReply)}</span></li>
      </ul>
      {rows.length === 0 ? (
        <p className={a.hint}>{t(admin.common.none, lang, "")}</p>
      ) : (
        <div className={a.tableWrap}>
          <table className={a.table}>
            <thead>
              <tr>
                <th>{L(c.client)}</th>
                <th>{L(c.specialist)}</th>
                <th>{t(admin.common.domain, lang, "")}</th>
                <th>{t(admin.common.status, lang, "")}</th>
                <th>{t(admin.common.created, lang, "")}</th>
                <th className={a.num}>{L(c.replyTime)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.full_name}
                    {r.company ? <span className={a.muted}> · {r.company}</span> : null}
                  </td>
                  <td>
                    <Link href={href(lang, `/specialister/${r.profile.slug}`)}>{r.profile.people?.display_name ?? r.profile.slug}</Link>
                  </td>
                  <td>{domainName(domains, r.profile.domain_id, lang)}</td>
                  <td><span className={p.tag}>{t(bookings.status[r.status], lang, r.status)}</span></td>
                  <td className={a.mono}>{fmtWhen(r.created_at, lang)}</td>
                  <td className={a.num}>{r.first_reply_at ? L(c.hours).replace("{n}", String(hoursBetween(r.created_at, r.first_reply_at))) : <span className={a.muted}>{L(c.noReply)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminFrame>
  );
}
