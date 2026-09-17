import type { ReactNode } from "react";
import { t, type I18nText, type Lang } from "@/lib/i18n";
import type { Viewer } from "@/lib/auth";
import type { DomainRow } from "@/lib/admin";
import { PortalShell } from "@/components/portal/PortalShell";
import { RichTitle } from "@/components/ui/RichTitle";
import { AdminNav } from "./AdminNav";
import p from "@/components/portal/portal.module.css";

/** Chrome shared by every admin page: portal shell, admin nav, heading. */
export function AdminFrame({
  lang,
  path,
  viewer,
  title,
  intro,
  children,
}: {
  lang: Lang;
  path: string;
  viewer: Viewer;
  title: I18nText;
  intro?: I18nText;
  children: ReactNode;
}) {
  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.wide}>
        <AdminNav lang={lang} pathname={path} />
        <h1 className={p.title}>
          <RichTitle text={t(title, lang, "")} />
        </h1>
        {intro ? <p className={p.intro}>{t(intro, lang, "")}</p> : null}
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
