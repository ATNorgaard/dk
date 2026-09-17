import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { href, isLang, safeInternalPath, t } from "@/lib/i18n";
import { getViewer } from "@/lib/auth";
import { auth } from "@/content/auth";
import { site } from "@/content/site";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LoginForm } from "@/components/forms/LoginForm";
import { RichTitle } from "@/components/ui/RichTitle";
import p from "@/components/portal/portal.module.css";

export async function generateMetadata({ params }: PageProps<"/[lang]/log-ind">): Promise<Metadata> {
  const { lang } = await params;
  return { title: isLang(lang) ? t(auth.login.eyebrow, lang, "") : "Log ind", robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/log-ind">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const sp = await searchParams;
  const next = safeInternalPath(typeof sp.next === "string" ? sp.next : null, href(lang, "/portal"));
  const linkError = sp.error === "link";
  // Already signed in, verified against the auth server: straight on. A token
  // the server has revoked fails this check and the form renders instead.
  if (await getViewer()) redirect(next.split("?")[0]);
  const c = auth.login;

  const nav = [
    { href: href(lang), label: site.nav.forClients },
    { href: href(lang, "/freelancere"), label: site.nav.forFreelancers },
  ];

  return (
    <>
      <SiteHeader lang={lang} pathname={href(lang, "/log-ind")} items={nav} cta={{ href: `${href(lang)}#kontakt`, label: site.header.bookMeeting }} />
      <main id="main" className={p.page}>
        <div className={p.narrow}>
          <span className="hds-eyebrow">{t(c.eyebrow, lang, "")}</span>
          <h1 className={p.title}>
            <RichTitle text={t(c.title, lang, "")} />
          </h1>
          <p className={p.intro}>{t(c.intro, lang, "")}</p>
          <LoginForm lang={lang} next={next} linkError={linkError} />
          <aside className={p.aside}>
            <h2>{t(c.noAccessTitle, lang, "")}</h2>
            <p>{t(c.noAccessText, lang, "")}</p>
            <p>
              <Link href={`${href(lang)}#kontakt`}>{t(c.contact, lang, "")}</Link> ·{" "}
              <Link href={href(lang, "/freelancere")}>{t(c.apply, lang, "")}</Link>
            </p>
          </aside>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
