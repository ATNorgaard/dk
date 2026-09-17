import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { loadHouse, pad2 } from "@/lib/house";
import { availabilityLine, loadTeaserBySlug, loadTeaserSlugs, loadFullProfile, portraitUrl } from "@/lib/specialists";
import { getViewer, hasRole } from "@/lib/auth";
import { site } from "@/content/site";
import { landing } from "@/content/landing";
import { specialists } from "@/content/specialists";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ContactBlock } from "@/components/ui/primitives";
import { ContactForm } from "@/components/forms/ContactForm";
import { AccessRequestForm } from "@/components/forms/AccessRequestForm";
import { BookingForm } from "@/components/booking/BookingForm";
import { bookings } from "@/content/bookings";
import s from "./page.module.css";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await loadTeaserSlugs();
  return (["da", "en"] as const).flatMap((lang) => slugs.map(({ slug }) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/specialister/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLang(lang)) return {};
  const te = await loadTeaserBySlug(slug);
  if (!te) return {};
  return { title: te.display_name, description: t(te.tagline, lang, "") || undefined };
}

export default async function SpecialistPage({ params }: PageProps<"/[lang]/specialister/[slug]">) {
  const { lang, slug } = await params;
  if (!isLang(lang)) notFound();
  const te = await loadTeaserBySlug(slug);
  if (!te) notFound();
  const house = await loadHouse();
  const domain = house.domains.find((d) => d.id === te.domain_id);
  const c = specialists.page;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  // The full CV is for signed-in clients (and the board, and the specialist themselves).
  // getViewer reads cookies, so this page renders per request when someone is signed in.
  const viewer = await getViewer();
  const full = viewer && hasRole(viewer, "client", "board", "admin", "specialist") ? await loadFullProfile({ slug }) : null;
  const portrait = portraitUrl(te.portrait_path);
  const years = te.years_in_craft !== null ? L(specialists.teaser.years).replace("{n}", String(te.years_in_craft)) : null;

  const nav = [
    { href: href(lang), label: site.nav.forClients },
    { href: href(lang, "/freelancere"), label: site.nav.forFreelancers },
  ];

  return (
    <>
      <SiteHeader lang={lang} pathname={href(lang, `/specialister/${slug}`)} items={nav} cta={{ href: "#kontakt", label: site.header.bookMeeting }} />
      <main id="main">
        <section id="top" className={s.hero}>
          <div className={s.heroInner}>
            {domain ? (
              <Link href={href(lang, `/domaener/${domain.slug}`)} className={s.back}>
                ← {L(c.back)} · {t(domain.name, lang, domain.id)}
              </Link>
            ) : null}
            <div className={s.head}>
              {portrait ? (
                <Image src={portrait} alt={te.display_name} width={160} height={160} className={s.portrait} />
              ) : (
                <div className={s.initials} aria-hidden="true">
                  {te.display_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                </div>
              )}
              <div>
                <span className="hds-eyebrow">
                  {domain ? `${L({ da: "Domæne", en: "Domain" })} ${pad2(domain.sortOrder)} · ${L(specialists.teaser.seat)} ${pad2(te.seat_position)}` : ""}
                </span>
                <h1 className={s.title}>{te.display_name}</h1>
                {te.title ? <p className={s.role}>{t(te.title, lang, "")}</p> : null}
                {te.tagline ? <p className={`${s.tagline} hds-serif`}>{t(te.tagline, lang, "")}</p> : null}
                <p className={s.meta}>
                  {[te.city, years, availabilityLine(te, lang)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            {t(te.skills, lang, []).length ? (
              <ul className={s.skills}>
                {t(te.skills, lang, []).map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>

        {full ? (
          <section className={s.body}>
            <div className={s.bodyInner}>
              {full.profile.summary ? (
                <div className={s.block}>
                  <h2>{L(c.about)}</h2>
                  <p className={s.pre}>{t(full.profile.summary, lang, "")}</p>
                </div>
              ) : null}
              {full.experience.length ? (
                <div className={s.block}>
                  <h2>{L(c.experience)}</h2>
                  <ol className={s.timeline}>
                    {full.experience.map((e) => (
                      <li key={e.id}>
                        <span className={s.when}>
                          {e.start_date?.slice(0, 4) ?? ""}–{e.end_date ? e.end_date.slice(0, 4) : L(c.ongoing)}
                        </span>
                        <h3>{t(e.title, lang, "")} · {e.organisation}</h3>
                        {e.description ? <p className={s.pre}>{t(e.description, lang, "")}</p> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <div className={s.cols}>
                {full.education.length ? (
                  <div className={s.block}>
                    <h2>{L(c.education)}</h2>
                    <ul className={s.list}>
                      {full.education.map((e) => (
                        <li key={e.id}>
                          <b>{t(e.degree, lang, "")}</b> · {e.institution}
                          {e.end_year ? <span className={s.dim}> · {e.end_year}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {full.certifications.length ? (
                  <div className={s.block}>
                    <h2>{L(c.certifications)}</h2>
                    <ul className={s.list}>
                      {full.certifications.map((e) => (
                        <li key={e.id}>
                          <b>{e.name}</b>
                          {e.issuer ? ` · ${e.issuer}` : ""}
                          {e.year ? <span className={s.dim}> · {e.year}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <dl className={s.facts}>
                {full.profile.languages.length ? (<><dt>{L(c.languages)}</dt><dd>{full.profile.languages.map((x) => x.toUpperCase()).join(", ")}</dd></>) : null}
                {full.profile.rate_text ? (<><dt>{L(c.rate)}</dt><dd>{full.profile.rate_text}</dd></>) : null}
                {full.profile.weekly_hours !== null ? (<><dt>{L(c.availability)}</dt><dd>{L(c.hoursPerWeek).replace("{n}", String(full.profile.weekly_hours))} · {availabilityLine(te, lang)}</dd></>) : null}
                {full.email || full.profile.linkedin_url || full.profile.website_url ? (
                  <>
                    <dt>{L(c.contact)}</dt>
                    <dd>
                      {[
                        full.email ? <a key="mail" href={`mailto:${full.email}`}>{full.email}</a> : null,
                        full.profile.linkedin_url ? <a key="li" href={full.profile.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a> : null,
                        full.profile.website_url ? <a key="web" href={full.profile.website_url} target="_blank" rel="noreferrer">{L(c.website)}</a> : null,
                      ]
                        .filter(Boolean)
                        .map((el, i) => (i ? <span key={i}> · {el}</span> : el))}
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
          </section>
        ) : (
          <section className={s.gate} id="adgang">
            <div className={s.bodyInner}>
              <h2>{L(c.gateTitle)}</h2>
              <p>{L(c.gateText)}</p>
              <h3 className={s.gateSub}>{L(c.gateAsk)}</h3>
              <p>{L(c.gateAskIntro)}</p>
              <AccessRequestForm lang={lang} sourceSlug={slug} />
            </div>
          </section>
        )}

        <section className={s.booking} id="book">
          <div className={s.bodyInner}>
            <span className="hds-eyebrow">{L(bookings.form.eyebrow)}</span>
            <h2 className={s.bookingTitle}>{L(bookings.form.title).replace("{name}", te.display_name.split(" ")[0])}</h2>
            <p className={s.pre}>{L(bookings.form.intro).replace("{name}", te.display_name.split(" ")[0])}</p>
            <BookingForm
              lang={lang}
              profileId={te.id}
              specialistName={te.display_name}
              prefill={viewer?.person ? { name: viewer.person.displayName, email: viewer.email ?? "" } : null}
            />
          </div>
        </section>

        <ContactBlock id="kontakt" lang={lang} eyebrow={landing.contact.eyebrow} title={landing.contact.title} intro={landing.contact.intro}>
          <ContactForm lang={lang} domainId={te.domain_id} path={href(lang, `/specialister/${slug}`)} />
        </ContactBlock>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
