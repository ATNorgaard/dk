import Link from "next/link";
import { href, t, type Lang } from "@/lib/i18n";
import { admin } from "@/content/admin";
import s from "./admin.module.css";

const ITEMS = [
  { path: "", label: admin.nav.overview },
  { path: "/ansoegninger", label: admin.nav.applications },
  { path: "/henvendelser", label: admin.nav.contacts },
  { path: "/domaener", label: admin.nav.domains },
  { path: "/pladser", label: admin.nav.seats },
  { path: "/personer", label: admin.nav.people },
  { path: "/tal", label: admin.nav.numbers },
  { path: "/log", label: admin.nav.log },
];

/** Second-level navigation for the admin pages. */
export function AdminNav({ lang, pathname }: { lang: Lang; pathname: string }) {
  return (
    <nav className={s.subnav} aria-label="Admin">
      {ITEMS.map((it) => {
        const target = href(lang, `/admin${it.path}`);
        const current = it.path === "" ? pathname === target : pathname.startsWith(target);
        return (
          <Link key={it.path} href={target} aria-current={current ? "page" : undefined}>
            {t(it.label, lang, "")}
          </Link>
        );
      })}
    </nav>
  );
}
