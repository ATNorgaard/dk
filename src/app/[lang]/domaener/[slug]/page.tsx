import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { loadDomainBySlug, loadHouse, pad2 } from "@/lib/house";
import { loadTeasers } from "@/lib/specialists";
import { site } from "@/content/site";
import { landing } from "@/content/landing";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Button, CapabilityList, Card, CardGrid, ContactBlock, Section, SectionHeading } from "@/components/ui/primitives";
import { SpecialistCard } from "@/components/specialists/SpecialistCard";
import { ContactForm } from "@/components/forms/ContactForm";
import { TrackView } from "@/components/analytics/TrackView";
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

/**
 * One domain: what it does (description and typical briefs, edited under
 * Admin → Domæner), who sits there (everything the public teaser holds),
 * how an engagement starts (the landing's three steps), the neighbouring
 * domains, and the contact form tagged with the domain.
 */
export default async function DomainPage({ params }: PageProps<"/[lang]/domaener/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const data = await loadDomainBySlug(slug);
  if (!data) notFound();
  const { domain: d, neighbours } = data;
  const people = (await loadTeasers()).get(d.id) ?? [];
  const da = lang === "da";
  const total = d.activeSeats + d.openSeats;
  const paragraphs = t(d.description, lang, "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const tasks = t(d.typicalTasks, lang, []);
  const recruiting = d.activeSeats === 0 || people.length === 0;
  let n = 0;
  const num = () => pad2(++n);

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

        {paragraphs.length || tasks.length ? (
          <Section id="om" tone="paper" number={num()} label={{ da: "Om domænet", en: "About the domain" }} lang={lang} headingId="om-title">
            <SectionHeading id="om-title" lang={lang} title={{ da: "Det, domænet {em}laver{/em}.", en: "What the domain {em}does{/em}." }} />
            <div className={s.about}>
              <div className={s.prose}>
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {tasks.length ? (
                <div className={s.tasks}>
                  <h3>{da ? "Typiske opgaver" : "Typical briefs"}</h3>
                  <ol>
                    {tasks.map((task, i) => (
                      <li key={task}>
                        <span>{pad2(i + 1)}</span>
                        {task}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        <Section id="specialister" tone="paper" number={num()} label={{ da: "Specialister", en: "Specialists" }} lang={lang} headingId="spec-title">
          <SectionHeading
            id="spec-title"
            lang={lang}
            title={
              people.length === 0
                ? { da: "Vinduet er {em}ledigt{/em}.", en: "The window is {em}open{/em}." }
                : { da: "Dem, der sidder {em}her{/em}.", en: "The people {em}here{/em}." }
            }
            intro={
              people.length === 0
                ? landing.hero.recruitingText
                : {
                    da: "Selvstændige specialister med egen praksis. Åbn en profil for at se erfaring, uddannelse og takst, og book tyve minutter direkte.",
                    en: "Independent specialists with a practice of their own. Open a profile for experience, education and rate, and book twenty minutes directly.",
                  }
            }
          />
          {people.length ? (
            <ul className={s.people}>
              {people.map((te, idx) => (
                <SpecialistCard key={te.id} te={te} lang={lang} index={idx} />
              ))}
            </ul>
          ) : null}
          {recruiting ? (
            <div className={s.recruit}>
              <Button href="#kontakt">{t(landing.hero.contactUs, lang, "")}</Button>
              <Button href={href(lang, "/freelancere#ansoeg")} variant="outline" trailing="→">
                {t(landing.hero.applyHere, lang, "")}
              </Button>
            </div>
          ) : null}
        </Section>

        <Section id="saadan" tone="ink-panel" number={num()} label={{ da: "Sådan foregår det", en: "How it works" }} lang={lang} headingId="how-title">
          <SectionHeading id="how-title" lang={lang} title={landing.how.title} intro={landing.how.intro} />
          <CapabilityList items={landing.how.steps} lang={lang} />
          {!recruiting ? (
            <div className={s.recruit}>
              <Button href="#kontakt">{t(site.header.bookMeeting, lang, "")}</Button>
              <Button href={href(lang, "/freelancere#ansoeg")} variant="outline" trailing="→">
                {t(landing.hero.applyHere, lang, "")}
              </Button>
            </div>
          ) : null}
        </Section>

        {neighbours.length ? (
          <Section id="naboer" tone="paper" number={num()} label={{ da: "Naboer", en: "Neighbours" }} lang={lang} headingId="naboer-title">
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
              {neighbours.map((nb, idx) => (
                <Card
                  key={nb.id}
                  index={idx}
                  href={href(lang, `/domaener/${nb.slug}`)}
                  tag={`${da ? "Domæne" : "Domain"} ${pad2(nb.sortOrder)}`}
                  title={t(nb.name, lang, nb.id)}
                  text={t(nb.blurb, lang, "")}
                  meta={t(site.status[nb.status], lang, "")}
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
          links={[{ href: href(lang, "/freelancere"), label: t(landing.contact.joinLink, lang, "") }]}
        >
          <ContactForm lang={lang} domainId={d.id} path={href(lang, `/domaener/${d.slug}`)} />
        </ContactBlock>
      </main>
      <SiteFooter lang={lang} />
      <TrackView type="domain_view" lang={lang} domainId={d.id} />
    </>
  );
}
