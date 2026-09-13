import type { ReactNode } from "react";
import Link from "next/link";
import type { I18nText, Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { RichTitle } from "./RichTitle";
import type { Titled } from "@/content/landing";
import s from "./ui.module.css";

type Tone = "paper" | "ink" | "ink-panel";

export function Section({
  id,
  tone = "paper",
  number,
  label,
  lang,
  children,
  headingId,
}: {
  id: string;
  tone?: Tone;
  number: string;
  label: I18nText;
  lang: Lang;
  headingId?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={s.section} data-tone={tone} aria-labelledby={headingId}>
      <div className={s.inner}>
        <div className={s.label} aria-hidden="true">
          <b>{number}</b>
          <span>{t(label, lang, "")}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

export function SectionHeading({
  id,
  title,
  intro,
  lang,
  vars,
}: {
  id?: string;
  title: I18nText;
  intro?: I18nText;
  lang: Lang;
  vars?: Record<string, string | number>;
}) {
  return (
    <div className={s.heading}>
      <h2 id={id} className={s.headingTitle}>
        <RichTitle text={t(title, lang, "")} vars={vars} />
      </h2>
      {intro ? <p className={s.headingIntro}>{t(intro, lang, "")}</p> : null}
    </div>
  );
}

export function CapabilityList({ items, lang }: { items: Titled[]; lang: Lang }) {
  return (
    <ol className={s.caps}>
      {items.map((it) => (
        <li key={it.number ?? t(it.title, lang, "")}>
          <span className={s.num}>{it.number}</span>
          <h3>{t(it.title, lang, "")}</h3>
          <p>{t(it.text, lang, "")}</p>
        </li>
      ))}
    </ol>
  );
}

export function FactStrip({
  items,
  lang,
}: {
  items: { label: I18nText; value: string; detail: I18nText }[];
  lang: Lang;
}) {
  return (
    <div className={s.facts}>
      {items.map((f) => (
        <div key={t(f.label, lang, "")}>
          <span className={s.factLabel}>{t(f.label, lang, "")}</span>
          <span className={`${s.factValue} hds-tabular`}>{f.value}</span>
          <span className={s.factDetail}>{t(f.detail, lang, "")}</span>
        </div>
      ))}
    </div>
  );
}

export function TwoColumns({ children }: { children: ReactNode }) {
  return <div className={s.twoCol}>{children}</div>;
}

export function Callout({ label, text, lang }: { label: I18nText; text: I18nText; lang: Lang }) {
  return (
    <div className={s.callout}>
      <span className={s.calloutLabel}>{t(label, lang, "")}</span>
      <p>{t(text, lang, "")}</p>
    </div>
  );
}

export function Timeline({
  items,
  lang,
}: {
  items: { period: I18nText; title: I18nText; role: I18nText; text: I18nText }[];
  lang: Lang;
}) {
  return (
    <ol className={s.timeline}>
      {items.map((it) => (
        <li key={t(it.period, lang, "")}>
          <span className={s.period}>{t(it.period, lang, "")}</span>
          <h3>{t(it.title, lang, "")}</h3>
          <span className={s.role}>{t(it.role, lang, "")}</span>
          <p>{t(it.text, lang, "")}</p>
        </li>
      ))}
    </ol>
  );
}

export function Faq({ items, lang }: { items: { q: I18nText; a: I18nText }[]; lang: Lang }) {
  return (
    <div className={s.faq}>
      {items.map((it) => (
        <div key={t(it.q, lang, "")}>
          <h3>{t(it.q, lang, "")}</h3>
          <p>{t(it.a, lang, "")}</p>
        </div>
      ))}
    </div>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <ul className={s.cards}>{children}</ul>;
}

export function Card({
  href,
  tag,
  title,
  text,
  meta,
}: {
  href: string;
  tag?: string;
  title: string;
  text?: string;
  meta?: string;
}) {
  return (
    <li>
      <Link href={href} className={s.card}>
        {tag ? <span className={s.tag}>{tag}</span> : null}
        <h3>{title}</h3>
        {text ? <p>{text}</p> : null}
        {meta ? <span className={s.meta}>{meta}</span> : null}
      </Link>
    </li>
  );
}

export function ContactBlock({
  id,
  eyebrow,
  title,
  intro,
  links,
  lang,
  children,
}: {
  id: string;
  eyebrow: I18nText;
  title: I18nText;
  intro: I18nText;
  links?: { href: string; label: string }[];
  lang: Lang;
  /** A form; when given it takes the right-hand column and the links move below the intro. */
  children?: ReactNode;
}) {
  const linkList = links?.length ? (
    <ul className={s.links}>
      {links.map((l) => (
        <li key={l.href}>
          <a href={l.href}>{l.label}</a>
        </li>
      ))}
    </ul>
  ) : null;
  return (
    <section id={id} className={s.contact} aria-labelledby={`${id}-title`} data-form={!!children}>
      <div className={s.inner}>
        <div>
          <span className={s.eyebrow}>{t(eyebrow, lang, "")}</span>
          <h2 id={`${id}-title`}>
            <RichTitle text={t(title, lang, "")} />
          </h2>
          <p className={s.intro}>{t(intro, lang, "")}</p>
          {children ? <div className={s.contactLinksBelow}>{linkList}</div> : null}
        </div>
        {children ?? linkList}
      </div>
    </section>
  );
}

export function MotionBand({ items }: { items: string[] }) {
  /* The track holds the row twice so the -50% loop point is seamless. */
  const row = (prefix: string) =>
    items.flatMap((it, i) => [
      <span key={`${prefix}-${i}-t`}>{it}</span>,
      <i key={`${prefix}-${i}-d`} aria-hidden="true">·</i>,
    ]);
  return (
    <div className={s.band} aria-hidden="true">
      <div className={s.bandTrack}>
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

export function Button({
  href,
  variant,
  children,
  trailing,
}: {
  href: string;
  variant?: "entry" | "outline" | "light";
  children: ReactNode;
  trailing?: string;
}) {
  const external = href.startsWith("mailto:") || href.startsWith("http") || href.startsWith("#");
  const cls = s.button;
  const inner = (
    <>
      {children}
      {trailing ? <span aria-hidden="true">{trailing}</span> : null}
    </>
  );
  return external ? (
    <a href={href} className={cls} data-variant={variant}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls} data-variant={variant}>
      {inner}
    </Link>
  );
}
