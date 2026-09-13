"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitContact, type FormState } from "@/app/actions/intake";
import { href, t, type I18nText, type Lang } from "@/lib/i18n";
import { site } from "@/content/site";
import s from "./forms.module.css";

const c = {
  name: { da: "Navn", en: "Name" },
  email: { da: "Arbejdsmail", en: "Work email" },
  company: { da: "Virksomhed (valgfrit)", en: "Company (optional)" },
  message: { da: "Hvad handler opgaven om?", en: "What is the brief about?" },
  consent: {
    da: "Jeg accepterer, at TrustUsConsult behandler mine oplysninger for at svare på min henvendelse.",
    en: "I accept that TrustUsConsult processes my details to answer my enquiry.",
  },
  privacy: { da: "Læs om privatliv", en: "Read the privacy notice" },
  submit: { da: "Send", en: "Send" },
  sending: { da: "Sender…", en: "Sending…" },
  orMail: { da: "Eller skriv til", en: "Or email" },
  doneTitle: { da: "Tak. Vi har din besked.", en: "Thanks. We have your message." },
  doneText: {
    da: "Vi finder domænet og svarer inden for en hverdag.",
    en: "We find the domain and reply within one working day.",
  },
};

const initial: FormState = { status: "idle" };

export function ContactForm({ lang, domainId, path }: { lang: Lang; domainId?: string; path: string }) {
  const [state, action, pending] = useActionState(submitContact, initial);
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
      <input type="hidden" name="path" value={path} />
      {domainId ? <input type="hidden" name="domain_id" value={domainId} /> : null}
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
      <label className={s.field}>
        <span>{L(c.company)}</span>
        <input name="company" autoComplete="organization" />
      </label>
      <label className={s.field} data-error={!!err.message}>
        <span>{L(c.message)}</span>
        <textarea name="message" required />
        {err.message ? <em className={s.error}>{err.message}</em> : null}
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
          {L(c.orMail)} <a href={`mailto:${site.email.contact}`}>{site.email.contact}</a>
        </span>
      </div>
    </form>
  );
}
