import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { href, otherLang, switchLangPath, t, type Lang } from "@/lib/i18n";
import { hasRole, type Viewer } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { site } from "@/content/site";
import { auth } from "@/content/auth";
import { SiteFooter } from "@/components/site/SiteFooter";
import h from "@/components/site/site.module.css";
import p from "./portal.module.css";

/**
 * Chrome for signed-in pages: wordmark, portal nav (admin only for board and
 * admin), language switch and a sign-out button. Rendered per request.
 */
export function PortalShell({
  lang,
  pathname,
  viewer,
  children,
}: {
  lang: Lang;
  pathname: string;
  viewer: Viewer;
  children: ReactNode;
}) {
  const other = otherLang(lang);
  const items = [{ href: href(lang, "/portal"), label: auth.portal.nav }];
  if (hasRole(viewer, "board", "admin")) items.push({ href: href(lang, "/admin"), label: auth.admin.nav });

  return (
    <>
      <a href="#main" className={h.skip}>
        {t(site.header.skip, lang, "")}
      </a>
      <header className={h.header}>
        <Link href={href(lang)} className={h.wordmark} aria-label={site.name}>
          <Image src="/brand/tuc-logo-dark.png" alt={site.name} width={129} height={22} priority />
        </Link>
        <nav className={h.nav} aria-label="Portal">
          {items.map((it) => (
            <Link key={it.href} href={it.href} aria-current={pathname === it.href ? "page" : undefined}>
              {t(it.label, lang, "")}
            </Link>
          ))}
        </nav>
        <div className={h.actions}>
          <Link
            href={switchLangPath(pathname, other)}
            hrefLang={other}
            lang={other}
            className={h.langSwitch}
            aria-label={t(site.header.switchTo, lang, "")}
          >
            {other.toUpperCase()}
          </Link>
          <form action={signOut}>
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" className={`${h.cta} ${p.signOut}`}>
              {t(auth.portal.signOut, lang, "")}
            </button>
          </form>
        </div>
      </header>
      <main id="main" className={p.page}>
        {children}
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
