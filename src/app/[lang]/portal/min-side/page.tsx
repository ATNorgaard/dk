import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { completeness, isLive, loadFullProfile, portraitUrl } from "@/lib/specialists";
import { loadHouse } from "@/lib/house";
import { specialists } from "@/content/specialists";
import { setPublished } from "@/app/actions/profile";
import { PortalShell } from "@/components/portal/PortalShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { PortraitUpload } from "@/components/profile/PortraitUpload";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusChip } from "@/components/portal/StatusChip";
import { auth } from "@/content/auth";
import p from "@/components/portal/portal.module.css";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Min side", robots: { index: false } };

export default async function MinSidePage({ params }: PageProps<"/[lang]/portal/min-side">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/portal/min-side");
  // Specialists only: board and clients have no page here, even by URL.
  const viewer = await requireRole(lang, path, "specialist");
  const c = specialists.minSide;
  const L = (v: { da: string; en: string }) => t(v, lang, "");
  const full = viewer.person ? await loadFullProfile({ personId: viewer.person.id }) : null;

  if (!full) {
    return (
      <PortalShell lang={lang} pathname={path} viewer={viewer}>
        <div className={p.dash}>
          <PageHeader eyebrow={L(c.eyebrow)} title={L(c.title)} intro={L(c.noProfile)} />
        </div>
      </PortalShell>
    );
  }

  const { profile: pr } = full;
  const [live, house] = await Promise.all([isLive(pr.id), loadHouse()]);
  const domain = house.domains.find((d) => d.id === pr.domain_id);
  const pct = completeness(full);
  const statusKey = live ? "live" : pr.is_published ? "publishedNoSeat" : "draft";

  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.dash}>
        <PageHeader
          eyebrow={`${L(c.eyebrow)} · ${domain ? t(domain.name, lang, domain.id) : pr.domain_id}`}
          title={L(c.title)}
          intro={L(c.intro)}
          chips={
            <>
              <StatusChip status={statusKey} label={L(auth.portal.dashboard.statusShort[statusKey])} />
              <span className={p.chip} data-tone="neutral">{L(c.completeness).replace("{pct}", String(pct))}</span>
            </>
          }
          actions={live ? <Link href={href(lang, `/specialister/${pr.slug}`)} className={p.quiet}>{L(c.viewPublic)} ↗</Link> : null}
        />
        <p className={a.hint}>{L(c.status[statusKey])}</p>

        <ProfileEditor lang={lang} path={path} profile={pr} experience={full.experience} education={full.education} certifications={full.certifications} />

        <section className={p.section}>
          <h2>{L(c.sections.portrait)}</h2>
          <PortraitUpload lang={lang} path={path} personId={pr.person_id} current={portraitUrl(pr.portrait_path)} />
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
