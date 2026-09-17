import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireViewer } from "@/lib/auth";
import { completeness, isLive, loadFullProfile, portraitUrl } from "@/lib/specialists";
import { loadHouse } from "@/lib/house";
import { specialists } from "@/content/specialists";
import {
  removeCertification,
  removeEducation,
  removeExperience,
  saveAbout,
  saveAvailability,
  saveBasics,
  saveCertification,
  saveEducation,
  saveExperience,
  saveLinks,
  setPublished,
} from "@/app/actions/profile";
import { PortalShell } from "@/components/portal/PortalShell";
import { RichTitle } from "@/components/ui/RichTitle";
import { ActionForm } from "@/components/admin/ActionForm";
import { PortraitUpload } from "@/components/profile/PortraitUpload";
import { CvImport } from "@/components/profile/CvImport";
import p from "@/components/portal/portal.module.css";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Min side", robots: { index: false } };

export default async function MinSidePage({ params }: PageProps<"/[lang]/portal/min-side">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/portal/min-side");
  const viewer = await requireViewer(lang, path);
  const c = specialists.minSide;
  const L = (v: { da: string; en: string }) => t(v, lang, "");
  const full = viewer.person ? await loadFullProfile({ personId: viewer.person.id }) : null;

  if (!full) {
    return (
      <PortalShell lang={lang} pathname={path} viewer={viewer}>
        <div className={p.wide}>
          <span className="hds-eyebrow">{L(c.eyebrow)}</span>
          <h1 className={p.title}><RichTitle text={L(c.title)} /></h1>
          <p className={p.intro}>{L(c.noProfile)}</p>
        </div>
      </PortalShell>
    );
  }

  const { profile: pr } = full;
  const [live, house] = await Promise.all([isLive(pr.id), loadHouse()]);
  const domain = house.domains.find((d) => d.id === pr.domain_id);
  const pct = completeness(full);
  const statusKey = live ? "live" : pr.is_published ? "publishedNoSeat" : "draft";

  const pair = (key: string, label: string, kind: "input" | "textarea", values?: { da: string; en: string } | null, rows?: number) => (
    <div className={a.grid2}>
      {(["da", "en"] as const).map((l) =>
        kind === "input" ? (
          <label key={l} className={a.field}>
            <span>{label} · {l.toUpperCase()}</span>
            <input name={`${key}_${l}`} defaultValue={values?.[l] ?? ""} />
          </label>
        ) : (
          <label key={l} className={a.field}>
            <span>{label} · {l.toUpperCase()}</span>
            <textarea name={`${key}_${l}`} defaultValue={values?.[l] ?? ""} rows={rows ?? 4} />
          </label>
        ),
      )}
    </div>
  );

  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.wide}>
        <span className="hds-eyebrow">{L(c.eyebrow)} · {domain ? t(domain.name, lang, domain.id) : pr.domain_id}</span>
        <h1 className={p.title}><RichTitle text={L(c.title)} /></h1>
        <p className={p.intro}>{L(c.intro)}</p>
        <p className={p.notice} role="status">
          {L(c.status[statusKey])} {L(c.completeness).replace("{pct}", String(pct))}
          {live ? <> · <Link href={href(lang, `/specialister/${pr.slug}`)}>{L(c.viewPublic)} →</Link></> : null}
        </p>

        <section className={p.section}>
          <h2>{L(c.sections.basics)}</h2>
          <ActionForm action={saveBasics} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)}>
            {pair("title", L(c.fields.title), "input", pr.title)}
            {pair("tagline", L(c.fields.tagline), "input", pr.tagline)}
            <div className={a.grid2}>
              <label className={a.field}>
                <span>{L(c.fields.city)}</span>
                <input name="city" defaultValue={pr.city ?? ""} />
              </label>
              <label className={a.field}>
                <span>{L(c.fields.years)}</span>
                <input name="years_in_craft" type="number" min={0} max={60} defaultValue={pr.years_in_craft ?? ""} className={a.narrow} />
              </label>
            </div>
          </ActionForm>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.portrait)}</h2>
          <PortraitUpload lang={lang} path={path} personId={pr.person_id} current={portraitUrl(pr.portrait_path)} />
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.about)}</h2>
          <ActionForm action={saveAbout} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)}>
            {pair("summary", L(c.fields.summary), "textarea", pr.summary, 7)}
            {pair("skills", L(c.fields.skills), "textarea", { da: (pr.skills?.da ?? []).join("\n"), en: (pr.skills?.en ?? []).join("\n") }, 5)}
            <label className={a.field}>
              <span>{L(c.fields.languages)}</span>
              <input name="languages" defaultValue={pr.languages.join(", ")} />
            </label>
          </ActionForm>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.availability)}</h2>
          <ActionForm action={saveAvailability} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)}>
            <div className={a.grid2}>
              <label className={a.field}>
                <span>{L(c.fields.rate)}</span>
                <input name="rate_text" defaultValue={pr.rate_text ?? ""} placeholder="1.450 kr./time" />
              </label>
              <label className={a.field}>
                <span>{L(c.fields.weeklyHours)}</span>
                <input name="weekly_hours" type="number" min={0} max={60} defaultValue={pr.weekly_hours ?? ""} className={a.narrow} />
              </label>
              <label className={a.field}>
                <span>{L(c.fields.availableFrom)}</span>
                <input name="available_from" type="date" defaultValue={pr.available_from ?? ""} />
              </label>
              <label className={a.field}>
                <span>{L(c.fields.bookedUntil)}</span>
                <input name="booked_until" type="date" defaultValue={pr.booked_until ?? ""} />
              </label>
            </div>
          </ActionForm>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.links)}</h2>
          <ActionForm action={saveLinks} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)}>
            <div className={a.grid2}>
              <label className={a.field}>
                <span>{L(c.fields.linkedin)}</span>
                <input name="linkedin_url" defaultValue={pr.linkedin_url ?? ""} placeholder="https://www.linkedin.com/in/…" />
              </label>
              <label className={a.field}>
                <span>{L(c.fields.website)}</span>
                <input name="website_url" defaultValue={pr.website_url ?? ""} placeholder="https://" />
              </label>
              <label className={a.field}>
                <span>{L(c.fields.slug)}</span>
                <input name="slug" defaultValue={pr.slug} pattern="[a-z0-9-]{3,80}" />
              </label>
            </div>
          </ActionForm>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.experience)}</h2>
          {full.experience.map((e) => (
            <div key={e.id} className={a.card}>
              <ActionForm action={saveExperience} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)}>
                <input type="hidden" name="id" value={e.id} />
                <div className={a.grid2}>
                  <label className={a.field}>
                    <span>{L(c.fields.organisation)}</span>
                    <input name="organisation" defaultValue={e.organisation} required />
                  </label>
                  <div className={a.grid2}>
                    <label className={a.field}>
                      <span>{L(c.fields.from)}</span>
                      <input name="start_date" type="date" defaultValue={e.start_date ?? ""} />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.fields.to)}</span>
                      <input name="end_date" type="date" defaultValue={e.end_date ?? ""} />
                    </label>
                  </div>
                </div>
                {pair("title", L(c.fields.role), "input", e.title)}
                {pair("description", L(c.fields.description), "textarea", e.description, 3)}
              </ActionForm>
              <ActionForm action={removeExperience} lang={lang} path={path} submit={L(c.remove)} confirm={`${L(c.remove)} ${e.organisation}?`} inline>
                <input type="hidden" name="id" value={e.id} />
              </ActionForm>
            </div>
          ))}
          <details className={a.card}>
            <summary>{L(c.add)} · {L(c.sections.experience)}</summary>
            <ActionForm action={saveExperience} lang={lang} path={path} submit={L(c.add)} pending={L(c.saving)}>
              <div className={a.grid2}>
                <label className={a.field}>
                  <span>{L(c.fields.organisation)}</span>
                  <input name="organisation" required />
                </label>
                <div className={a.grid2}>
                  <label className={a.field}>
                    <span>{L(c.fields.from)}</span>
                    <input name="start_date" type="date" />
                  </label>
                  <label className={a.field}>
                    <span>{L(c.fields.to)}</span>
                    <input name="end_date" type="date" />
                  </label>
                </div>
              </div>
              {pair("title", L(c.fields.role), "input")}
              {pair("description", L(c.fields.description), "textarea", null, 3)}
            </ActionForm>
          </details>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.education)}</h2>
          {full.education.map((e) => (
            <div key={e.id} className={a.card}>
              <ActionForm action={saveEducation} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)}>
                <input type="hidden" name="id" value={e.id} />
                <div className={a.grid2}>
                  <label className={a.field}>
                    <span>{L(c.fields.institution)}</span>
                    <input name="institution" defaultValue={e.institution} required />
                  </label>
                  <div className={a.grid2}>
                    <label className={a.field}>
                      <span>{L(c.fields.startYear)}</span>
                      <input name="start_year" type="number" min={1950} max={2100} defaultValue={e.start_year ?? ""} className={a.narrow} />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.fields.endYear)}</span>
                      <input name="end_year" type="number" min={1950} max={2100} defaultValue={e.end_year ?? ""} className={a.narrow} />
                    </label>
                  </div>
                </div>
                {pair("degree", L(c.fields.degree), "input", e.degree)}
              </ActionForm>
              <ActionForm action={removeEducation} lang={lang} path={path} submit={L(c.remove)} confirm={`${L(c.remove)} ${e.institution}?`} inline>
                <input type="hidden" name="id" value={e.id} />
              </ActionForm>
            </div>
          ))}
          <details className={a.card}>
            <summary>{L(c.add)} · {L(c.sections.education)}</summary>
            <ActionForm action={saveEducation} lang={lang} path={path} submit={L(c.add)} pending={L(c.saving)}>
              <div className={a.grid2}>
                <label className={a.field}>
                  <span>{L(c.fields.institution)}</span>
                  <input name="institution" required />
                </label>
                <div className={a.grid2}>
                  <label className={a.field}>
                    <span>{L(c.fields.startYear)}</span>
                    <input name="start_year" type="number" min={1950} max={2100} className={a.narrow} />
                  </label>
                  <label className={a.field}>
                    <span>{L(c.fields.endYear)}</span>
                    <input name="end_year" type="number" min={1950} max={2100} className={a.narrow} />
                  </label>
                </div>
              </div>
              {pair("degree", L(c.fields.degree), "input")}
            </ActionForm>
          </details>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.certifications)}</h2>
          {full.certifications.map((e) => (
            <div key={e.id} className={a.card}>
              <ActionForm action={saveCertification} lang={lang} path={path} submit={L(c.save)} pending={L(c.saving)} inline>
                <input type="hidden" name="id" value={e.id} />
                <label className={a.field}>
                  <span>{L(c.fields.certName)}</span>
                  <input name="name" defaultValue={e.name} required />
                </label>
                <label className={a.field}>
                  <span>{L(c.fields.issuer)}</span>
                  <input name="issuer" defaultValue={e.issuer ?? ""} />
                </label>
                <label className={a.field}>
                  <span>{L(c.fields.year)}</span>
                  <input name="year" type="number" min={1950} max={2100} defaultValue={e.year ?? ""} className={a.narrow} />
                </label>
              </ActionForm>
              <ActionForm action={removeCertification} lang={lang} path={path} submit={L(c.remove)} confirm={`${L(c.remove)} ${e.name}?`} inline>
                <input type="hidden" name="id" value={e.id} />
              </ActionForm>
            </div>
          ))}
          <ActionForm action={saveCertification} lang={lang} path={path} submit={L(c.add)} pending={L(c.saving)} inline>
            <label className={a.field}>
              <span>{L(c.fields.certName)}</span>
              <input name="name" />
            </label>
            <label className={a.field}>
              <span>{L(c.fields.issuer)}</span>
              <input name="issuer" />
            </label>
            <label className={a.field}>
              <span>{L(c.fields.year)}</span>
              <input name="year" type="number" min={1950} max={2100} className={a.narrow} />
            </label>
          </ActionForm>
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.import)}</h2>
          <CvImport lang={lang} path={path} />
        </section>

        <section className={p.section}>
          <h2>{L(c.sections.publish)}</h2>
          <p className={a.hint}>{L(c.status[statusKey])}</p>
          <ActionForm action={setPublished} lang={lang} path={path} submit={pr.is_published ? L({ da: "Gør til kladde", en: "Make draft" }) : L(c.fields.published)} pending={L(c.saving)} inline>
            <input type="hidden" name="is_published" value={pr.is_published ? "0" : "1"} />
          </ActionForm>
        </section>
      </div>
    </PortalShell>
  );
}
