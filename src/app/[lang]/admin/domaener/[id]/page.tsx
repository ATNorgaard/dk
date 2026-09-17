import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { getDomainForAdmin } from "@/lib/admin";
import { admin } from "@/content/admin";
import { saveDomain } from "@/app/actions/admin";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Domæne · Admin", robots: { index: false } };

export default async function DomainEditPage({ params }: PageProps<"/[lang]/admin/domaener/[id]">) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, `/admin/domaener/${id}`);
  const viewer = await requireRole(lang, path, "board", "admin");
  const d = await getDomainForAdmin(id);
  if (!d) notFound();
  const c = admin.domains;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  const pair = (key: string, label: string, kind: "input" | "textarea" = "input", values?: { da: string; en: string } | null) => (
    <div className={a.grid2}>
      {(["da", "en"] as const).map((l) =>
        kind === "input" ? (
          <label key={l} className={a.field}>
            <span>{label} · {L(admin.common[l])}</span>
            <input name={`${key}_${l}`} defaultValue={values?.[l] ?? ""} />
          </label>
        ) : (
          <label key={l} className={a.field}>
            <span>{label} · {L(admin.common[l])}</span>
            <textarea name={`${key}_${l}`} defaultValue={values?.[l] ?? ""} />
          </label>
        ),
      )}
    </div>
  );

  return (
    <AdminFrame lang={lang} path={path} viewer={viewer} title={{ da: d.name.da, en: d.name.en }}>
      <p className={a.meta}>
        <Link href={href(lang, "/admin/domaener")}>← {L(admin.common.back)}</Link>
        {" · "}
        <span className={a.mono}>{d.id}</span>
        {" · "}
        <a href={href(lang, `/domaener/${d.slug}`)} target="_blank" rel="noreferrer">/{lang}/domaener/{d.slug} ↗</a>
      </p>

      <ActionForm action={saveDomain} lang={lang} path={path} submit={L(admin.common.save)} pending={L(admin.common.saving)}>
        <input type="hidden" name="id" value={d.id} />
        {pair("name", L(c.fields.name), "input", d.name)}
        <div className={a.grid2}>
          <label className={a.field}>
            <span>{L(c.fields.slug)}</span>
            <input name="slug" defaultValue={d.slug} pattern="[a-z0-9-]+" />
          </label>
          <label className={a.field}>
            <span>{L(c.fields.targetSeats)}</span>
            <input name="target_seats" type="number" min={0} max={12} defaultValue={d.target_seats} className={a.narrow} />
          </label>
        </div>
        {pair("tagline", L(c.fields.tagline), "input", d.tagline)}
        {pair("house_description", L(c.fields.houseDescription), "textarea", d.house_description)}
        {pair("blurb", L(c.fields.blurb), "textarea", d.blurb)}
        {pair("description", L(c.fields.description), "textarea", d.description)}
        {pair("typical_tasks", L(c.fields.typicalTasks), "textarea", { da: (d.typical_tasks?.da ?? []).join("\n"), en: (d.typical_tasks?.en ?? []).join("\n") })}
        {pair("skills", L(c.fields.skills), "textarea", { da: (d.skills?.da ?? []).join("\n"), en: (d.skills?.en ?? []).join("\n") })}
        <div className={a.grid2}>
          <label className={a.field}>
            <span>{L(c.fields.override)}</span>
            <select name="status_override" defaultValue={d.status_override ?? ""}>
              <option value="">{L(c.fields.overrideAuto)}</option>
              <option value="needs">{t(admin.seats.status.open, lang, "")} / {L({ da: "søger", en: "recruiting" })}</option>
              <option value="healthy">{L({ da: "Bemandet", en: "Staffed" })}</option>
              <option value="full">{L({ da: "Fuldt booket", en: "Fully booked" })}</option>
            </select>
          </label>
          <label className={a.check} style={{ alignSelf: "end", paddingBottom: 10 }}>
            <input type="checkbox" name="is_published" defaultChecked={d.is_published} />
            {L(c.fields.published)}
          </label>
        </div>
      </ActionForm>
    </AdminFrame>
  );
}
