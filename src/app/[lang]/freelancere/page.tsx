import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { loadHouse } from "@/lib/house";
import { freelancere as F } from "@/content/freelancere";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { RichTitle, fill } from "@/components/ui/RichTitle";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { TrackView } from "@/components/analytics/TrackView";
import {
  Button,
  Callout,
  CapabilityList,
  Card,
  CardGrid,
  ContactBlock,
  FactStrip,
  MotionBand,
  Section,
  SectionHeading,
  Timeline,
  TwoColumns,
} from "@/components/ui/primitives";
import s from "./page.module.css";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/[lang]/freelancere">): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === "en" ? "For freelancers" : "For freelancere" };
}

export default async function FreelancerePage({ params }: PageProps<"/[lang]/freelancere">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const house = await loadHouse();
  const open = house.domains.filter((d) => d.status === "needs");

  const nav = [
    { href: "#hvad", label: F.sections.gets.label },
    { href: "#oekonomi", label: F.sections.economics.label },
    { href: "#optagelse", label: F.sections.admission.label },
    { href: "#aabne", label: F.sections.open.label },
    { href: href(lang), label: site.nav.forClients },
  ];

  return (
    <>
      <SiteHeader lang={lang} pathname={href(lang, "/freelancere")} items={nav} cta={{ href: "#ansoeg", label: site.header.apply }} />
      <main id="main">
        <section id="top" className={s.hero}>
          <div className={s.heroInner}>
            <span className="hds-eyebrow">{t(F.hero.eyebrow, lang, "")}</span>
            <h1 className={s.title}>
              <RichTitle text={t(F.hero.title, lang, "")} />
            </h1>
            <p className={s.lede}>{t(F.hero.lede, lang, "")}</p>
            <div className={s.ctas}>
              <Button href="#ansoeg" variant="light" trailing="↓">{t(F.hero.primary, lang, "")}</Button>
              <Button href={href(lang)} variant="outline" trailing="↗">{t(F.hero.secondary, lang, "")}</Button>
            </div>
          </div>
        </section>

        <MotionBand items={t(F.band, lang, [])} />

        <Section id="hvad" tone="paper" number={F.sections.gets.number} label={F.sections.gets.label} lang={lang} headingId="hvad-title">
          <SectionHeading id="hvad-title" title={F.gets.title} intro={F.gets.intro} lang={lang} />
          <CapabilityList items={F.gets.items} lang={lang} />
          <FactStrip lang={lang} items={F.gets.facts.map((f) => ({ label: f.label, value: t(f.value, lang, ""), detail: f.detail }))} />
        </Section>

        <Section id="oekonomi" tone="ink" number={F.sections.economics.number} label={F.sections.economics.label} lang={lang} headingId="oekonomi-title">
          <SectionHeading id="oekonomi-title" title={F.economics.title} intro={F.economics.intro} lang={lang} />
          <TwoColumns>
            {[F.economics.buyIn, F.economics.share].map((e) => (
              <div key={t(e.label, lang, "")} className={s.econ}>
                <span className="hds-eyebrow">{t(e.label, lang, "")}</span>
                <h3>{t(e.value, lang, "")}</h3>
                <p>{t(e.text, lang, "")}</p>
              </div>
            ))}
          </TwoColumns>
        </Section>

        <Section id="optagelse" tone="paper" number={F.sections.admission.number} label={F.sections.admission.label} lang={lang} headingId="optagelse-title">
          <SectionHeading id="optagelse-title" title={F.admission.title} intro={F.admission.intro} lang={lang} />
          <Timeline items={F.admission.steps} lang={lang} />
          <Callout label={F.admission.calloutLabel} text={F.admission.calloutText} lang={lang} />
        </Section>

        <Section id="aabne" tone="ink-panel" number={F.sections.open.number} label={F.sections.open.label} lang={lang} headingId="aabne-title">
          <SectionHeading id="aabne-title" title={F.open.title} intro={F.open.intro} lang={lang} vars={{ n: open.length }} />
          <CardGrid>
            {open.map((d, idx) => (
              <Card
                key={d.id}
                index={idx}
                href={href(lang, `/domaener/${d.slug}`)}
                tag={`${lang === "da" ? "Domæne" : "Domain"} ${String(d.sortOrder).padStart(2, "0")}`}
                title={t(d.name, lang, d.id)}
                text={t(d.blurb, lang, "")}
                meta={d.openSeats === 1 ? t(F.open.seatLineOne, lang, "") : fill(t(F.open.seatLine, lang, ""), { n: d.openSeats })}
              />
            ))}
          </CardGrid>
        </Section>

        <ContactBlock
          id="ansoeg"
          lang={lang}
          eyebrow={F.contact.eyebrow}
          title={F.contact.title}
          intro={F.contact.intro}
          links={[{ href: href(lang), label: t(F.contact.frontPage, lang, "") }]}
        >
          <ApplicationForm
            lang={lang}
            domains={house.domains.map((d) => ({ id: d.id, name: d.name, sortOrder: d.sortOrder, open: d.status === "needs" }))}
          />
        </ContactBlock>
      </main>
      <SiteFooter lang={lang} />
      <TrackView type="page_view" lang={lang} />
    </>
  );
}
