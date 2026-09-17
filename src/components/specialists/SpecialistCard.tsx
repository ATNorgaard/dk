import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { href, t, type Lang } from "@/lib/i18n";
import { availabilityLine, portraitUrl, type Teaser } from "@/lib/specialists";
import { pad2 } from "@/lib/house";
import { specialists } from "@/content/specialists";
import s from "./specialist-card.module.css";

/**
 * A specialist on a domain page: everything the public teaser view holds,
 * so a visitor can tell who this is before opening the page. Portrait or
 * initials, seat, name, title, one-liner, city, years, availability, the
 * first skills, and the invitation to meet them.
 */
export function SpecialistCard({ te, lang, index }: { te: Teaser; lang: Lang; index: number }) {
  const portrait = portraitUrl(te.portrait_path);
  const first = te.display_name.split(/\s+/)[0];
  const years = te.years_in_craft !== null ? t(specialists.teaser.years, lang, "").replace("{n}", String(te.years_in_craft)) : null;
  const skills = t(te.skills, lang, []).slice(0, 5);
  return (
    <li data-reveal="" style={{ "--i": index } as CSSProperties}>
      <Link href={href(lang, `/specialister/${te.slug}`)} className={s.card}>
        <div className={s.top}>
          {portrait ? (
            <Image src={portrait} alt="" width={72} height={72} className={s.portrait} />
          ) : (
            <div className={s.initials} aria-hidden="true">
              {te.display_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
            </div>
          )}
          <div className={s.head}>
            <span className={s.tag}>
              {t(specialists.teaser.seat, lang, "")} {pad2(te.seat_position)}
            </span>
            <h3>{te.display_name}</h3>
            {te.title ? <p className={s.role}>{t(te.title, lang, "")}</p> : null}
          </div>
        </div>
        {te.tagline ? <p className={`${s.tagline} hds-serif`}>{t(te.tagline, lang, "")}</p> : null}
        <p className={s.meta}>{[te.city, years, availabilityLine(te, lang)].filter(Boolean).join(" · ")}</p>
        {skills.length ? (
          <ul className={s.skills}>
            {skills.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        ) : null}
        <span className={s.cta}>{t(specialists.teaser.meet, lang, "").replace("{name}", first)} →</span>
      </Link>
    </li>
  );
}
