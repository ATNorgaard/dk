import { href, type Lang } from "@/lib/i18n";
import { site } from "@/content/site";
import type { LegalDoc } from "@/content/legal";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import s from "./legal.module.css";

/** Privacy and terms: one narrow column of headed sections, with the draft notice on top while it applies. */
export function LegalPage({ lang, pathname, doc }: { lang: Lang; pathname: string; doc: LegalDoc }) {
  const nav = [
    { href: href(lang), label: site.nav.forClients },
    { href: href(lang, "/freelancere"), label: site.nav.forFreelancers },
  ];
  return (
    <>
      <SiteHeader lang={lang} pathname={pathname} items={nav} cta={{ href: `${href(lang)}#kontakt`, label: site.header.bookMeeting }} />
      <main id="main" className={s.page}>
        <article className={s.article}>
          <span className="hds-eyebrow">{doc.updated}</span>
          <h1 className={s.title}>{doc.title}</h1>
          <p className={s.notice} role="note">{doc.draftNotice}</p>
          <p className={s.intro}>{doc.intro}</p>
          {doc.sections.map((sec) => (
            <section key={sec.heading} className={s.section}>
              <h2>{sec.heading}</h2>
              {sec.paragraphs?.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              {sec.items?.length ? (
                <ul>
                  {sec.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
