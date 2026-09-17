import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { listContacts, listDomainsForAdmin } from "@/lib/admin";
import { admin } from "@/content/admin";
import { setContactHandled } from "@/app/actions/admin";
import { AdminFrame, domainName, fmtDate } from "@/components/admin/AdminFrame";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Henvendelser · Admin", robots: { index: false } };

export default async function ContactsPage({ params, searchParams }: PageProps<"/[lang]/admin/henvendelser">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/henvendelser");
  const viewer = await requireRole(lang, path, "board", "admin");
  const sp = await searchParams;
  const showHandled = sp.vis === "besvarede";
  const [rows, domains] = await Promise.all([listContacts(showHandled), listDomainsForAdmin()]);
  const c = admin.contacts;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <div className={a.filters}>
        <Link href={path} aria-current={!showHandled ? "true" : undefined}>{L(c.open)}</Link>
        <Link href={`${path}?vis=besvarede`} aria-current={showHandled ? "true" : undefined}>{L(c.handled)}</Link>
      </div>

      {rows.length === 0 ? (
        <p className={a.hint}>{t(admin.common.none, lang, "")}</p>
      ) : (
        <div>
          {rows.map((r) => (
            <article key={r.id} className={a.card}>
              <div className={a.cardHead}>
                <h3>
                  {r.full_name}
                  {r.company ? <span className={a.muted}> · {r.company}</span> : null}
                </h3>
                <span className={a.meta}>{fmtDate(r.created_at, lang)}</span>
              </div>
              <p className={a.meta}>
                <a href={`mailto:${r.email}`}>{r.email}</a>
                {r.domain_id ? ` · ${domainName(domains, r.domain_id, lang)}` : ""}
                {` · ${r.lang.toUpperCase()}`}
                {r.handled_at ? ` · ${L(c.handledAt)} ${fmtDate(r.handled_at, lang)}` : ""}
              </p>
              <p className={a.pre}>{r.message}</p>
              <ActionForm
                action={setContactHandled}
                lang={lang}
                path={path + (showHandled ? "?vis=besvarede" : "")}
                submit={L(r.handled_at ? c.reopen : c.markHandled)}
                pending={L(admin.common.saving)}
                inline
              >
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="handled" value={r.handled_at ? "0" : "1"} />
                <label className={a.field}>
                  <span>{L(c.note)}</span>
                  <input name="internal_note" defaultValue={r.internal_note ?? ""} />
                </label>
              </ActionForm>
            </article>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
