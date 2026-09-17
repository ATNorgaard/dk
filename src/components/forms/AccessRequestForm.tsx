"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitAccessRequest, type FormState } from "@/app/actions/intake";
import { href, t, type I18nText, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";
import s from "./forms.module.css";

const initial: FormState = { status: "idle" };

/** Behind the CV gate: a visitor asks the board for client access. */
export function AccessRequestForm({ lang, sourceSlug }: { lang: Lang; sourceSlug: string }) {
  const [state, action, pending] = useActionState(submitAccessRequest, initial);
  const err = state.status === "error" ? state.fields ?? {} : {};
  const c = specialists.page;
  const L = (v: I18nText) => t(v, lang, "");

  if (state.status === "ok") {
    return (
      <div className={s.done} role="status">
        <h3>{L(c.askDoneTitle)}</h3>
        <p>{L(c.askDoneText)}</p>
      </div>
    );
  }

  return (
    <form action={action} className={s.form} noValidate>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="source_slug" value={sourceSlug} />
      <div className={s.honeypot} aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className={s.row}>
        <label className={s.field} data-error={!!err.full_name}>
          <span>{L(c.askName)}</span>
          <input name="full_name" autoComplete="name" required />
          {err.full_name ? <em className={s.error}>{err.full_name}</em> : null}
        </label>
        <label className={s.field} data-error={!!err.email}>
          <span>{L(c.askEmail)}</span>
          <input name="email" type="email" autoComplete="email" required />
          {err.email ? <em className={s.error}>{err.email}</em> : null}
        </label>
      </div>
      <label className={s.field}>
        <span>{L(c.askCompany)}</span>
        <input name="company" autoComplete="organization" />
      </label>
      <label className={s.field} data-error={!!err.message}>
        <span>{L(c.askMessage)}</span>
        <textarea name="message" required />
        {err.message ? <em className={s.error}>{err.message}</em> : null}
      </label>
      <label className={s.consent} data-error={!!err.consent}>
        <input type="checkbox" name="consent" required />
        <span>
          {L(c.askConsent)} <Link href={href(lang, "/privatliv")}>{lang === "da" ? "Læs om privatliv" : "Read the privacy notice"}</Link>
          {err.consent ? <em className={s.error}> {err.consent}</em> : null}
        </span>
      </label>
      {state.status === "error" && state.message ? <p className={s.failed}>{state.message}</p> : null}
      <div className={s.actions}>
        <button type="submit" className={s.submit} disabled={pending}>
          {pending ? L(c.askSending) : L(c.askSubmit)} <span aria-hidden="true">→</span>
        </button>
        <span className={s.alt}>
          <Link href={`${href(lang, "/log-ind")}?next=${encodeURIComponent(href(lang, `/specialister/${sourceSlug}`))}`}>{L(c.gateLogin)}</Link>
        </span>
      </div>
    </form>
  );
}
