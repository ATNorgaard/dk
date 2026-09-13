"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitApplication, type FormState } from "@/app/actions/intake";
import { href, t, type I18nText, type Lang } from "@/lib/i18n";
import { site } from "@/content/site";
import s from "./forms.module.css";

type DomainOption = { id: string; name: I18nText; sortOrder: number; open: boolean };

const c = {
  name: { da: "Navn", en: "Name" },
  email: { da: "E-mail", en: "Email" },
  phone: { da: "Telefon (valgfrit)", en: "Phone (optional)" },
  linkedin: { da: "LinkedIn-profil (valgfrit)", en: "LinkedIn profile (optional)" },
  domain: { da: "Domæne", en: "Domain" },
  domainUnsure: { da: "Er du i tvivl? Skriv dit fag", en: "Not sure? Name your craft" },
  pickDomain: { da: "Vælg domæne…", en: "Pick a domain…" },
  years: { da: "År i faget", en: "Years in the craft" },
  cases: { da: "To cases, kort", en: "Two cases, briefly" },
  casesHint: { da: "Hvad var opgaven, hvad gjorde du, hvad kom der ud af det.", en: "What the brief was, what you did, what came of it." },
  reference: { da: "En reference, vi kan ringe til", en: "A reference we can call" },
  message: { da: "Andet, vi skal vide (valgfrit)", en: "Anything else we should know (optional)" },
  consent: {
    da: "Jeg accepterer, at TrustUsConsult behandler mine oplysninger for at vurdere min ansøgning. Afviste ansøgninger slettes efter seks måneder.",
    en: "I accept that TrustUsConsult processes my details to assess my application. Declined applications are deleted after six months.",
  },
  privacy: { da: "Læs om privatliv", en: "Read the privacy notice" },
  submit: { da: "Send ansøgning", en: "Send application" },
  sending: { da: "Sender…", en: "Sending…" },
  orMail: { da: "Eller send CV direkte til", en: "Or send your CV directly to" },
  doneTitle: { da: "Ansøgningen er modtaget.", en: "Application received." },
  doneText: {
    da: "Domænet svarer inden for fem hverdage. Du hører fra os på den e-mail, du har skrevet.",
    en: "The domain answers within five working days. You will hear from us at the email you gave.",
  },
  open: { da: "ledig plads", en: "open seat" },
};

const initial: FormState = { status: "idle" };

export function ApplicationForm({ lang, domains }: { lang: Lang; domains: DomainOption[] }) {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const err = state.status === "error" ? state.fields ?? {} : {};
  const L = (v: I18nText) => t(v, lang, "");

  if (state.status === "ok") {
    return (
      <div className={s.done} role="status">
        <h3>{L(c.doneTitle)}</h3>
        <p>{L(c.doneText)}</p>
      </div>
    );
  }

  return (
    <form action={action} className={s.form} noValidate>
      <input type="hidden" name="lang" value={lang} />
      <div className={s.honeypot} aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={s.row}>
        <label className={s.field} data-error={!!err.full_name}>
          <span>{L(c.name)}</span>
          <input name="full_name" autoComplete="name" required />
          {err.full_name ? <em className={s.error}>{err.full_name}</em> : null}
        </label>
        <label className={s.field} data-error={!!err.email}>
          <span>{L(c.email)}</span>
          <input name="email" type="email" autoComplete="email" required />
          {err.email ? <em className={s.error}>{err.email}</em> : null}
        </label>
      </div>

      <div className={s.row}>
        <label className={s.field}>
          <span>{L(c.phone)}</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className={s.field}>
          <span>{L(c.linkedin)}</span>
          <input name="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/…" />
        </label>
      </div>

      <div className={s.row}>
        <label className={s.field} data-error={!!err.domain_id}>
          <span>{L(c.domain)}</span>
          <select name="domain_id" defaultValue="">
            <option value="">{L(c.pickDomain)}</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {String(d.sortOrder).padStart(2, "0")} · {t(d.name, lang, d.id)}
                {d.open ? ` · ${L(c.open)}` : ""}
              </option>
            ))}
          </select>
          {err.domain_id ? <em className={s.error}>{err.domain_id}</em> : null}
        </label>
        <label className={s.field}>
          <span>{L(c.domainUnsure)}</span>
          <input name="craft" />
        </label>
      </div>

      <div className={s.row}>
        <label className={s.field}>
          <span>{L(c.years)}</span>
          <input name="years_in_craft" type="number" min={0} max={60} inputMode="numeric" />
        </label>
        <label className={s.field}>
          <span>{L(c.reference)}</span>
          <input name="reference_note" />
        </label>
      </div>

      <label className={s.field}>
        <span>{L(c.cases)}</span>
        <textarea name="cases" placeholder={L(c.casesHint)} />
      </label>

      <label className={s.field}>
        <span>{L(c.message)}</span>
        <textarea name="message" />
      </label>

      <label className={s.consent} data-error={!!err.consent}>
        <input type="checkbox" name="consent" required />
        <span>
          {L(c.consent)} <Link href={href(lang, "/privatliv")}>{L(c.privacy)}</Link>
          {err.consent ? <em className={s.error}> {err.consent}</em> : null}
        </span>
      </label>

      {state.status === "error" && state.message ? <p className={s.failed}>{state.message}</p> : null}

      <div className={s.actions}>
        <button type="submit" className={s.submit} disabled={pending}>
          {pending ? L(c.sending) : L(c.submit)} <span aria-hidden="true">→</span>
        </button>
        <span className={s.alt}>
          {L(c.orMail)} <a href={`mailto:${site.email.admission}`}>{site.email.admission}</a>
        </span>
      </div>
    </form>
  );
}
