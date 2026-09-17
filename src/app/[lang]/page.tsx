import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { loadHouse } from "@/lib/house";
import { landing } from "@/content/landing";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { HouseStage, type WindowTeaser } from "@/components/house/HouseStage";
import { loadTeasers } from "@/lib/specialists";
import { ContactForm } from "@/components/forms/ContactForm";
import { TrackView } from "@/components/analytics/TrackView";
import {
  Callout,
  CapabilityList,
  ContactBlock,
  FactStrip,
  Faq,
  MotionBand,
  Section,
  SectionHeading,
  TwoColumns,
} from "@/components/ui/primitives";

export const revalidate = 60;

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [house, teaserMap] = await Promise.all([loadHouse(), loadTeasers()]);
  const recruiting = house.domains.filter((d) => d.status === "needs").length;
  // First live specialist per domain for the window; the rest are on the domain page.
  const teasers: Record<string, WindowTeaser> = {};
  for (const [domainId, list] of teaserMap) {
    const first = list[0];
    teasers[domainId] = {
      slug: first.slug,
      name: first.display_name,
      title: t(first.title, lang, "") || null,
      tagline: t(first.tagline, lang, "") || null,
      city: first.city,
      years: first.years_in_craft,
      more: list.length - 1,
    };
  }
  const L = landing;

  const nav = [
    { href: "#kollektivet", label: L.sections.collective.label },
    { href: "#saadan", label: { da: "Sådan virker det", en: "How it works" } },
    { href: "#vaerktoejer", label: L.sections.tools.label },
    { href: "#spoergsmaal", label: L.sections.faq.label },
    { href: href(lang, "/freelancere"), label: site.nav.forFreelancers },
  ];

  return (
    <>
      <SiteHeader lang={lang} pathname={href(lang)} items={nav} cta={{ href: "#kontakt", label: site.header.bookMeeting }} />
      <main id="main">
        <HouseStage house={house} lang={lang} teasers={teasers} />

        <MotionBand items={house.domains.map((d) => t(d.name, lang, d.id))} />

        <Section id="kollektivet" tone="paper" number={L.sections.collective.number} label={L.sections.collective.label} lang={lang} headingId="kollektivet-title">
          <SectionHeading id="kollektivet-title" title={L.collective.title} intro={L.collective.intro} lang={lang} />
          <TwoColumns>
            <p>{t(L.collective.p1, lang, "")}</p>
            <p>{t(L.collective.p2, lang, "")}</p>
          </TwoColumns>
          <FactStrip
            lang={lang}
            items={[
              {
                label: L.collective.facts.domains.label,
                value: lang === "da" ? `${house.domains.length} domæner` : `${house.domains.length} domains`,
                detail: L.collective.facts.domains.detail,
              },
              {
                label: L.collective.facts.recruiting.label,
                value: lang === "da" ? `${recruiting} domæner søger` : `${recruiting} domains recruiting`,
                detail: L.collective.facts.recruiting.detail,
              },
              {
                label: L.collective.facts.bar.label,
                value: t(L.collective.facts.bar.value, lang, ""),
                detail: L.collective.facts.bar.detail,
              },
            ]}
          />
        </Section>

        <Section id="saadan" tone="ink" number={L.sections.how.number} label={L.sections.how.label} lang={lang} headingId="saadan-title">
          <SectionHeading id="saadan-title" title={L.how.title} intro={L.how.intro} lang={lang} />
          <CapabilityList items={L.how.steps} lang={lang} />
        </Section>

        <Section id="vaerktoejer" tone="paper" number={L.sections.tools.number} label={L.sections.tools.label} lang={lang} headingId="vaerktoejer-title">
          <SectionHeading id="vaerktoejer-title" title={L.tools.title} intro={L.tools.intro} lang={lang} />
          <CapabilityList items={L.tools.items} lang={lang} />
          <Callout label={L.tools.calloutLabel} text={L.tools.calloutText} lang={lang} />
        </Section>

        <Section id="spoergsmaal" tone="paper" number={L.sections.faq.number} label={L.sections.faq.label} lang={lang} headingId="faq-title">
          <SectionHeading id="faq-title" title={L.faq.title} intro={L.faq.intro} lang={lang} />
          <Faq items={L.faq.items} lang={lang} />
        </Section>

        <ContactBlock
          id="kontakt"
          lang={lang}
          eyebrow={L.contact.eyebrow}
          title={L.contact.title}
          intro={L.contact.intro}
          links={[{ href: href(lang, "/freelancere"), label: t(L.contact.joinLink, lang, "") }]}
        >
          <ContactForm lang={lang} path={href(lang)} />
        </ContactBlock>
      </main>
      <SiteFooter lang={lang} />
      <TrackView type="page_view" lang={lang} />
    </>
  );
}
