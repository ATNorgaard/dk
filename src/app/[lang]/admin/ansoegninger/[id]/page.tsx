import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { APPLICATION_STATUSES, getApplication, listDomainsForAdmin } from "@/lib/admin";
import { admin } from "@/content/admin";
import { addApplicationNote, setApplicationStatus } from "@/app/actions/admin";
import { AdminFrame, domainName, fmtDate } from "@/components/admin/AdminFrame";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Ansøgning · Admin", robots: { index: false } };

export default async function ApplicationPage({ params }: PageProps<"/[lang]/admin/ansoegninger/[id]">) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, `/admin/ansoegninger/${id}`);
  const viewer = await requireRole(lang, path, "board", "admin");
  const [data, domains] = await Promise.all([getApplication(id), listDomainsForAdmin()]);
  if (!data) notFound();
  const { application: r, notes } = data;
  const c = admin.applications;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  const facts: [string, string | null][] = [
    [L(admin.common.email), r.email],
    [L(c.fields.phone), r.phone],
    [L(admin.common.domain), r.domain_id ? domainName(domains, r.domain_id, lang) : null],
    [L(c.fields.craft), r.craft],
    [L(c.fields.years), r.years_in_craft !== null ? String(r.years_in_craft) : null],
    [L(c.fields.linkedin), r.linkedin_url],
    [L(admin.common.language), r.lang.toUpperCase()],
    [L(admin.common.created), fmtDate(r.created_at, lang)],
    [L(c.fields.decided), fmtDate(r.decided_at, lang)],
  ];

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={{ da: r.full_name, en: r.full_name }}>
      <p className={a.meta}>
        <Link href={href(lang, "/admin/ansoegninger")}>← {t(admin.common.back, lang, "")}</Link>
        {" · "}
        <span className={p.tag}>{t(c.status[r.status], lang, r.status)}</span>
      </p>

      <dl className={a.dl}>
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v?.startsWith("http") ? <a href={v} target="_blank" rel="noreferrer">{v}</a> : v}</dd>
          </div>
        ))}
        {r.cases ? (<><dt>{L(c.fields.cases)}</dt><dd>{r.cases}</dd></>) : null}
        {r.reference_note ? (<><dt>{L(c.fields.reference)}</dt><dd>{r.reference_note}</dd></>) : null}
        {r.message ? (<><dt>{L(c.fields.message)}</dt><dd>{r.message}</dd></>) : null}
      </dl>

      <section className={p.section}>
        <h2>{L(c.setStatus)}</h2>
        <ActionForm action={setApplicationStatus} lang={lang} path={path} submit={L(admin.common.save)} pending={L(admin.common.saving)} inline>
          <input type="hidden" name="id" value={r.id} />
          <label className={a.field}>
            <span>{L(admin.common.status)}</span>
            <select name="status" defaultValue={r.status}>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>{t(c.status[s], lang, s)}</option>
              ))}
            </select>
          </label>
        </ActionForm>
        {r.status === "accepted" ? <p className={a.hint}>{L(c.acceptedHint)}</p> : null}
      </section>

      <section className={p.section}>
        <h2>{L(c.notes)}</h2>
        {notes.length ? (
          <ul className={a.notes}>
            {notes.map((n) => (
              <li key={n.id}>
                <p>{n.body}</p>
                <span className={a.meta}>{n.author?.display_name ?? "–"} · {fmtDate(n.created_at, lang)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={a.hint}>{t(admin.common.none, lang, "")}</p>
        )}
        <ActionForm action={addApplicationNote} lang={lang} path={path} submit={L(c.addNote)} pending={L(admin.common.saving)}>
          <input type="hidden" name="id" value={r.id} />
          <label className={a.field}>
            <span>{L(c.notes)}</span>
            <textarea name="body" required placeholder={L(c.notePlaceholder)} />
          </label>
        </ActionForm>
      </section>
    </AdminFrame>
  );
}
