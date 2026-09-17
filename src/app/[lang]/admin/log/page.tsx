import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { listAuditLog, type AuditRow } from "@/lib/admin";
import { admin } from "@/content/admin";
import { AdminFrame, fmtDate } from "@/components/admin/AdminFrame";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Log · Admin", robots: { index: false } };

/** A one-line summary of the row an audit entry is about. */
function describe(r: AuditRow) {
  const d = (r.new_data ?? r.old_data ?? {}) as Record<string, unknown>;
  const name = (d.name as { da?: string } | undefined)?.da;
  const parts = [
    typeof d.full_name === "string" ? d.full_name : null,
    typeof d.display_name === "string" ? d.display_name : null,
    name ?? null,
    typeof d.email === "string" ? d.email : null,
    typeof d.role === "string" ? d.role : null,
    typeof d.domain_id === "string" ? d.domain_id : null,
    typeof d.position === "number" ? `#${d.position}` : null,
    typeof d.status === "string" ? d.status : null,
  ].filter(Boolean);
  if (r.action === "update" && r.old_data && r.new_data) {
    const changed = Object.keys(r.new_data).filter((k) => k !== "updated_at" && JSON.stringify(r.new_data![k]) !== JSON.stringify(r.old_data![k]));
    if (changed.length) parts.push(`(${changed.join(", ")})`);
  }
  return parts.join(" · ");
}

export default async function LogPage({ params }: PageProps<"/[lang]/admin/log">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/log");
  const viewer = await requireRole(lang, path, "board", "admin");
  const rows = await listAuditLog(200);
  const c = admin.log;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      {rows.length === 0 ? (
        <p className={a.hint}>{t(admin.common.none, lang, "")}</p>
      ) : (
        <div className={a.tableWrap}>
          <table className={a.table}>
            <thead>
              <tr>
                <th>{L(c.when)}</th>
                <th>{L(c.who)}</th>
                <th>{L(c.table)}</th>
                <th>{L(c.what)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={a.mono}>{fmtDate(r.at, lang)}</td>
                  <td>{r.actor?.display_name ?? <span className={a.muted}>–</span>}</td>
                  <td className={a.mono}>{r.table_name} · {r.action}</td>
                  <td>{describe(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminFrame>
  );
}
