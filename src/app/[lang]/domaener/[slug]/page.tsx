import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { loadDomainBySlug, loadHouse, pad2 } from "@/lib/house";
import { site } from "@/content/site";
import { landing } from "@/content/landing";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button, Card, CardGrid, ContactBlock, Section, SectionHeading } from "@/components/ui/primitives";
import s from "./page.module.css";

export const revalidate = 60;

export async function generateStaticParams() {
  const house = await loadHouse();
  return (["da", "en"] as const).flatMap((lang) => house.domains.map((d) => ({ lang, slug: d.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/domaener/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const data = await loadDomainBySlug(slug);
  if (!data) return {};
  return {
    title: t(data.domain.name, lang, slug),
    description: t(data.domain.blurb, lang, "") || undefined,
  };
}

export default async function DomainPage({ params }: PageProps<"/[lang]/domaener/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const data = await loadDomainBySlug(slug);
  if (!data) notFound();
  const { domain: d, neighbours } = data;
  const da = lang === "da";
  const total = d.activeSeats + d.openSeats;

  const nav = [
    { href: href(lang), label: site.nav.forClients },
    { href: href(lang, "/freelancere"), label: site.nav.forFreelancers },
  ];

  return (
    <>
      <SiteHeader lang={lang} pathname={href(lang, `/domaener/${d.slug}`)} items={nav} cta={{ href: "#kontakt", label: site.header.bookMeeting }} />
      <main id="main">
        <section id="top" className={s.hero}>
          <div className={s.heroInner}>
            <Link href={href(lang)} className={s.back}>
              ← {da ? "Tilbage til huset" : "Back to the house"}
            </Link>
            <span className="hds-eyebrow">
              {da ? "Domæne" : "Domain"} {pad2(d.sortOrder)} · {t(site.status[d.status], lang, "")}
            </span>
            <h1 className={s.title}>{t(d.name, lang, d.id)}</h1>
            {d.tagline ? <p className={`${s.tagline} hds-serif`}>{t(d.tagline, lang, "")}</p> : null}
            <p className={s.lede}>{t(d.blurb, lang, "")}</p>
            <ul className={s.skills}>
              {t(d.skills, lang, []).map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </div>
          <dl className={s.stats}>
            <div>
              <dt>{da ? "Pladser" : "Seats"}</dt>
              <dd className="hds-tabular">{d.activeSeats} / {total}</dd>
            </div>
            <div>
              <dt>{da ? "Specialister" : "Specialists"}</dt>
              <dd className="hds-tabular">{d.activeSeats}</dd>
            </div>
            <div>
              <dt>{da ? "Naboer" : "Neighbours"}</dt>
              <dd className="hds-tabular">{neighbours.length}</dd>
            </div>
          </dl>
        </section>

        <Section id="specialister" tone="paper" number="01" label={{ da: "Specialister", en: "Specialists" }} lang={lang} headingId="spec-title">
          <SectionHeading
            id="spec-title"
            lang={lang}
            title={
              d.activeSeats === 0
                ? { da: "Vinduet er {em}ledigt{/em}.", en: "The window is {em}open{/em}." }
                : { da: "Dem, der sidder {em}her{/em}.", en: "The people {em}here{/em}." }
            }
            intro={d.activeSeats === 0 ? landing.hero.recruitingText : undefined}
          />
          {d.activeSeats === 0 ? (
            <div className={s.recruit}>
              <Button href="#kontakt">{t(landing.hero.contactUs, lang, "")}</Button>
              <Button href={href(lang, "/freelancere#ansoeg")} variant="outline" trailing="→">
                {t(landing.hero.applyHere, lang, "")}
              </Button>
            </div>
          ) : null}
        </Section>

        {neighbours.length ? (
          <Section id="naboer" tone="ink-panel" number="02" label={{ da: "Naboer", en: "Neighbours" }} lang={lang} headingId="naboer-title">
            <SectionHeading
              id="naboer-title"
              lang={lang}
              title={{ da: "Vinduer, der lyser {em}med{/em}.", en: "Windows that light up {em}with it{/em}." }}
              intro={{
                da: "Domæner, der ofte arbejder sammen med dette. Trækker opgaven på flere fag, sætter kollektivet holdet.",
                en: "Domains that often work alongside this one. If the brief pulls in several crafts, the collective assembles the team.",
              }}
            />
            <CardGrid>
              {neighbours.map((n) => (
                <Card
                  key={n.id}
                  href={href(lang, `/domaener/${n.slug}`)}
                  tag={`${da ? "Domæne" : "Domain"} ${pad2(n.sortOrder)}`}
                  title={t(n.name, lang, n.id)}
                  text={t(n.blurb, lang, "")}
                  meta={t(site.status[n.status], lang, "")}
                />
              ))}
            </CardGrid>
          </Section>
        ) : null}

        <ContactBlock
          id="kontakt"
          lang={lang}
          eyebrow={landing.contact.eyebrow}
          title={landing.contact.title}
          intro={landing.contact.intro}
          links={[
            { href: `mailto:${site.email.contact}?subject=${encodeURIComponent(t(d.name, lang, d.id))}`, label: `${site.email.contact} ↗` },
            { href: href(lang, "/freelancere"), label: t(landing.contact.joinLink, lang, "") },
          ]}
        />
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
