import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { listAccessRequests } from "@/lib/admin";
import { admin } from "@/content/admin";
import { decideAccess } from "@/app/actions/admin";
import { AdminFrame, fmtDate } from "@/components/admin/AdminFrame";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Adgang · Admin", robots: { index: false } };

export default async function AccessPage({ params, searchParams }: PageProps<"/[lang]/admin/adgang">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/admin/adgang");
  const viewer = await requireRole(lang, path, "board", "admin");
  const sp = await searchParams;
  const showDecided = sp.vis === "afgjorte";
  const rows = await listAccessRequests(showDecided);
  const c = admin.access;
  const L = (v: { da: string; en: string }) => t(v, lang, "");
  const formPath = path + (showDecided ? "?vis=afgjorte" : "");

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={c.title} intro={c.intro}>
      <div className={a.filters}>
        <Link href={path} aria-current={!showDecided ? "true" : undefined}>{L(c.open)}</Link>
        <Link href={`${path}?vis=afgjorte`} aria-current={showDecided ? "true" : undefined}>{L(c.decided)}</Link>
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
                <span className={p.tag}>{t(c.status[r.status], lang, r.status)}</span>
              </div>
              <p className={a.meta}>
                <a href={`mailto:${r.email}`}>{r.email}</a>
                {` · ${r.lang.toUpperCase()} · ${fmtDate(r.created_at, lang)}`}
                {r.source_slug ? (
                  <>
                    {" · "}{L(c.cameFrom)} <Link href={href(lang, `/specialister/${r.source_slug}`)}>/{r.source_slug}</Link>
                  </>
                ) : null}
                {r.decided_at ? ` · ${fmtDate(r.decided_at, lang)}${r.decided_by ? ` · ${r.decided_by.display_name}` : ""}` : ""}
              </p>
              {r.message ? <p className={a.pre}><b>{L(c.lookingFor)}:</b> {r.message}</p> : null}
              {r.status === "received" ? (
                <div className={a.inlineForm}>
                  <ActionForm action={decideAccess} lang={lang} path={formPath} submit={L(c.approve)} pending={t(admin.common.saving, lang, "")} confirm={`${L(c.approve)}: ${r.full_name}?`} inline>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <label className={a.field}>
                      <span>{L(c.note)}</span>
                      <input name="internal_note" defaultValue={r.internal_note ?? ""} />
                    </label>
                  </ActionForm>
                  <ActionForm action={decideAccess} lang={lang} path={formPath} submit={L(c.decline)} confirm={`${L(c.decline)}: ${r.full_name}?`} inline>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="decision" value="decline" />
                  </ActionForm>
                </div>
              ) : r.internal_note ? (
                <p className={a.meta}>{L(c.note)}: {r.internal_note}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
