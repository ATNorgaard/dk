import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { href, t } from "@/lib/i18n";
import { site } from "@/content/site";
import s from "./site.module.css";

export function SiteFooter({ lang, topId = "top" }: { lang: Lang; topId?: string }) {
  return (
    <footer className={s.footer}>
      <div className={s.footerInner}>
        <span className={s.initials}>{site.initials}</span>
        <p className={s.footerLine}>{t(site.footer.line, lang, "")}</p>
        <nav className={s.utilities} aria-label="Utilities">
          {site.footer.utilities.map((u) => {
            const label = t(u.label, lang, "");
            if (u.href.startsWith("#") || u.href.startsWith("mailto:")) {
              return (
                <a key={u.key} href={u.href}>
                  {label}
                </a>
              );
            }
            return (
              <Link key={u.key} href={href(lang, u.href)}>
                {label}
              </Link>
            );
          })}
        </nav>
        <a href={`#${topId}`} className={s.toTop}>
          {t(site.footer.toTop, lang, "")} ↑
        </a>
      </div>
    </footer>
  );
}
