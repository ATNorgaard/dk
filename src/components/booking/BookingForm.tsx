"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitBooking } from "@/app/actions/bookings";
import type { FormState } from "@/app/actions/intake";
import { href, t, type I18nText, type Lang } from "@/lib/i18n";
import { bookings } from "@/content/bookings";
import { minDatetimeLocal } from "@/lib/dates";
import s from "@/components/forms/forms.module.css";
import b from "./booking.module.css";

const initial: FormState = { status: "idle" };

/**
 * The three-step request: duration and times, then contact and brief, then
 * confirmation. One form; the steps only decide which fields are visible,
 * so nothing is lost going back. Prefilled for a signed-in client.
 */
export function BookingForm({
  lang,
  profileId,
  specialistName,
  prefill,
}: {
  lang: Lang;
  profileId: string;
  specialistName: string;
  prefill?: { name: string; email: string } | null;
}) {
  const [state, action, pending] = useActionState(submitBooking, initial);
  const [step, setStep] = useState<1 | 2>(1);
  const err = state.status === "error" ? state.fields ?? {} : {};
  const c = bookings.form;
  const L = (v: I18nText) => t(v, lang, "").replace("{name}", specialistName.split(" ")[0]);
  const minLocal = minDatetimeLocal(2);

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
      <input type="hidden" name="profile_id" value={profileId} />
      <div className={s.honeypot} aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className={b.step}>{L(c.step).replace("{n}", String(step))}</p>

      <div className={b.pane} hidden={step !== 1}>
        <fieldset className={b.fieldset}>
          <legend className={b.legend}>{L(c.duration)}</legend>
          <label className={b.radio}>
            <input type="radio" name="duration" value="20" defaultChecked /> {L(c.d20)}
          </label>
          <label className={b.radio}>
            <input type="radio" name="duration" value="45" /> {L(c.d45)}
          </label>
        </fieldset>
        <fieldset className={b.fieldset}>
          <legend className={b.legend}>{L(c.times)}</legend>
          <p className={b.hint}>{L(c.timesHint)}</p>
          <div className={s.row}>
            {[1, 2, 3].map((n) => (
              <label key={n} className={s.field} data-error={n === 1 && !!err.time1}>
                <span>{L(c.timeN).replace("{n}", String(n))}</span>
                <input type="datetime-local" name={`time${n}`} min={minLocal} required={n === 1} />
                {n === 1 && err.time1 ? <em className={s.error}>{err.time1}</em> : null}
              </label>
            ))}
          </div>
        </fieldset>
        <div className={s.actions}>
          <button type="button" className={s.submit} onClick={() => setStep(2)}>
            {L(c.next)} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className={b.pane} hidden={step !== 2}>
        <div className={s.row}>
          <label className={s.field} data-error={!!err.full_name}>
            <span>{L(c.name)}</span>
            <input name="full_name" autoComplete="name" defaultValue={prefill?.name ?? ""} required />
            {err.full_name ? <em className={s.error}>{err.full_name}</em> : null}
          </label>
          <label className={s.field} data-error={!!err.email}>
            <span>{L(c.email)}</span>
            <input name="email" type="email" autoComplete="email" defaultValue={prefill?.email ?? ""} required />
            {err.email ? <em className={s.error}>{err.email}</em> : null}
          </label>
        </div>
        <label className={s.field}>
          <span>{L(c.company)}</span>
          <input name="company" autoComplete="organization" />
        </label>
        <label className={s.field} data-error={!!err.brief}>
          <span>{L(c.brief)}</span>
          <textarea name="brief" required />
          {err.brief ? <em className={s.error}>{err.brief}</em> : null}
        </label>
        <label className={s.consent} data-error={!!err.consent}>
          <input type="checkbox" name="consent" required />
          <span>
            {L(c.consent)} <Link href={href(lang, "/privatliv")}>{lang === "da" ? "Læs om privatliv" : "Read the privacy notice"}</Link>
            {err.consent ? <em className={s.error}> {err.consent}</em> : null}
          </span>
        </label>
        {state.status === "error" && state.message ? <p className={s.failed}>{state.message}</p> : null}
        {state.status === "error" && err.time1 ? <p className={s.failed}>{err.time1}</p> : null}
        <div className={s.actions}>
          <button type="button" className={b.back} onClick={() => setStep(1)}>
            ← {L(c.back)}
          </button>
          <button type="submit" className={s.submit} disabled={pending}>
            {pending ? L(c.sending) : L(c.submit)} <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </form>
  );
}
