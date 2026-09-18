import type { ReactNode } from "react";
import { t, type I18nText, type Lang } from "@/lib/i18n";
import type { Viewer } from "@/lib/auth";
import type { DomainRow } from "@/lib/admin";
import { PortalShell } from "@/components/portal/PortalShell";
import { PageHeader } from "@/components/portal/PageHeader";
import { auth } from "@/content/auth";
import p from "@/components/portal/portal.module.css";

/** Chrome shared by every admin page: the portal shell (its sidebar carries the admin destinations) and the page header. */
export function AdminFrame({
  lang,
  path,
  viewer,
  title,
  intro,
  actions,
  children,
}: {
  lang: Lang;
  path: string;
  viewer: Viewer;
  title: I18nText;
  intro?: I18nText;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.dash}>
        <PageHeader eyebrow={t(auth.admin.nav, lang, "")} title={t(title, lang, "")} intro={intro ? t(intro, lang, "") : undefined} actions={actions} />
        {children}
      </div>
    </PortalShell>
  );
}

export function fmtDate(iso: string | null | undefined, lang: Lang, withTime = true) {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang === "da" ? "da-DK" : "en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(iso));
}

export function domainName(domains: Pick<DomainRow, "id" | "name">[], id: string | null, lang: Lang) {
  if (!id) return "";
  const d = domains.find((x) => x.id === id);
  return d ? t(d.name, lang, id) : id;
}
