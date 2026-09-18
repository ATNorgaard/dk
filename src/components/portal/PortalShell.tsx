import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { href, otherLang, switchLangPath, t, type I18nText, type Lang } from "@/lib/i18n";
import { hasRole, type Viewer } from "@/lib/auth";
import { portalCounts } from "@/lib/portal";
import { signOut } from "@/app/actions/auth";
import { site } from "@/content/site";
import { auth } from "@/content/auth";
import { admin } from "@/content/admin";
import { specialists } from "@/content/specialists";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ViewAs } from "@/components/site/ViewAs";
import h from "@/components/site/site.module.css";
import p from "./portal.module.css";

type Item = { href: string; label: I18nText; badge?: number };
type Group = { label?: I18nText; items: Item[] };

/**
 * Chrome for signed-in pages: a charcoal sidebar with the destinations the
 * viewer's roles give them (and count badges for what is waiting), a quiet
 * top bar, the page, and the public footer. Rendered per request; the
 * counts come through row-level security like everything else.
 */
export async function PortalShell({ lang, pathname, viewer, children }: { lang: Lang; pathname: string; viewer: Viewer; children: ReactNode }) {
  const other = otherLang(lang);
  const counts = await portalCounts(viewer);
  const c = auth.portal.sidebar;
  const groups: Group[] = [{ items: [{ href: href(lang, "/portal"), label: c.overview }] }];
  if (hasRole(viewer, "specialist")) {
    groups.push({
      label: c.you,
      items: [
        { href: href(lang, "/portal/moeder"), label: c.meetings, badge: counts.myRequests },
        { href: href(lang, "/portal/min-side"), label: specialists.minSide.nav },
      ],
    });
  }
  if (hasRole(viewer, "board", "admin")) {
    groups.push({
      label: c.queue,
      items: [
        { href: href(lang, "/admin/ansoegninger"), label: admin.nav.applications, badge: counts.applications },
        { href: href(lang, "/admin/adgang"), label: admin.nav.access, badge: counts.access },
        { href: href(lang, "/admin/henvendelser"), label: admin.nav.contacts, badge: counts.contacts },
        { href: href(lang, "/admin/bookinger"), label: admin.nav.bookings, badge: counts.bookings },
      ],
    });
    groups.push({
      label: c.house,
      items: [
        { href: href(lang, "/admin/domaener"), label: admin.nav.domains },
        { href: href(lang, "/admin/pladser"), label: admin.nav.seats },
      ],
    });
    groups.push({
      label: c.office,
      items: [
        { href: href(lang, "/admin"), label: admin.nav.overview },
        { href: href(lang, "/admin/personer"), label: admin.nav.people },
        { href: href(lang, "/admin/tal"), label: admin.nav.numbers },
        { href: href(lang, "/admin/log"), label: admin.nav.log },
      ],
    });
  }
  const isCurrent = (target: string) => {
    if (target === href(lang, "/portal") || target === href(lang, "/admin")) return pathname === target;
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  return (
    <>
      <a href="#main" className={h.skip}>
        {t(site.header.skip, lang, "")}
      </a>
      <div className={p.shell} data-portal="">
        <aside className={p.sidebar}>
          <Link href={href(lang, "/portal")} className={p.sideMark} aria-label={site.name}>
            <Image src="/brand/tuc-logo-dark.png" alt={site.name} width={117} height={20} priority />
          </Link>
          <nav className={p.sidenav} aria-label="Portal">
            {groups.map((g, i) => (
              <div key={i} className={p.navGroup}>
                {g.label ? <span className={p.navLabel}>{t(g.label, lang, "")}</span> : null}
                {g.items.map((it) => (
                  <Link key={it.href} href={it.href} className={p.navItem} aria-current={isCurrent(it.href) ? "page" : undefined}>
                    <span>{t(it.label, lang, "")}</span>
                    {it.badge ? <b className={p.badge}>{it.badge}</b> : null}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className={p.sideFoot}>
            <Link href={switchLangPath(pathname, other)} hrefLang={other} lang={other} className={p.sideLink} aria-label={t(site.header.switchTo, lang, "")}>
              {t(site.header.switchTo, lang, "")}
            </Link>
            <ViewAs lang={lang} inline />
            <form action={signOut}>
              <input type="hidden" name="lang" value={lang} />
              <button type="submit" className={p.sideButton}>
                {t(auth.portal.signOut, lang, "")}
              </button>
            </form>
          </div>
        </aside>
        <div className={p.body}>
          <header className={p.topbar}>
            <span className={p.topName}>{viewer.person?.displayName ?? viewer.email}</span>
            <Link href={href(lang)} className={p.topLink}>
              {t(auth.portal.toSite, lang, "")} ↗
            </Link>
          </header>
          <main id="main" className={p.content}>
            {children}
          </main>
        </div>
      </div>
      <SiteFooter lang={lang} />
    </>
  );
}
