import Link from "next/link";
import Image from "next/image";
import type { I18nText, Lang } from "@/lib/i18n";
import { href, otherLang, switchLangPath, t } from "@/lib/i18n";
import { site } from "@/content/site";
import s from "./site.module.css";

export type NavItem = { href: string; label: I18nText };

export function SiteHeader({
  lang,
  pathname,
  items,
  cta,
}: {
  lang: Lang;
  /** Current pathname including the language prefix, for the language switch. */
  pathname: string;
  items: NavItem[];
  cta: { href: string; label: I18nText };
}) {
  const other = otherLang(lang);
  return (
    <>
      <a href="#main" className={s.skip}>
        {t(site.header.skip, lang, "")}
      </a>
      <header className={s.header}>
        <Link href={href(lang)} className={s.wordmark} aria-label={site.name}>
          <Image src="/brand/tuc-logo-dark.png" alt={site.name} width={129} height={22} priority />
        </Link>
        <nav className={s.nav} aria-label="Primary">
          {items.map((it) => (
            <a key={it.href} href={it.href}>
              {t(it.label, lang, "")}
            </a>
          ))}
        </nav>
        <div className={s.actions}>
          <Link
            href={switchLangPath(pathname, other)}
            hrefLang={other}
            lang={other}
            className={s.langSwitch}
            aria-label={t(site.header.switchTo, lang, "")}
          >
            {other.toUpperCase()}
          </Link>
          <a href={cta.href} className={s.cta}>
            {t(cta.label, lang, "")}
          </a>
        </div>
      </header>
    </>
  );
}
