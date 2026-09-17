"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestMagicLink, type LoginState } from "@/app/actions/auth";
import { href, t, type I18nText, type Lang } from "@/lib/i18n";
import { auth } from "@/content/auth";
import s from "./forms.module.css";

const initial: LoginState = { status: "idle" };

export function LoginForm({ lang, next, linkError }: { lang: Lang; next: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(requestMagicLink, initial);
  const L = (v: I18nText) => t(v, lang, "");
  const c = auth.login;

  if (state.status === "sent") {
    return (
      <div className={s.done} role="status">
        <h3>{L(c.sentTitle)}</h3>
        <p>{L(c.sentText)}</p>
        <p>
          <Link href={`${href(lang, "/log-ind")}?next=${encodeURIComponent(next)}`}>{L(c.again)}</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={s.form} noValidate>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />
      <div className={s.honeypot} aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {linkError && state.status === "idle" ? <p className={s.failed}>{L(c.errors.link)}</p> : null}

      <label className={s.field} data-error={state.status === "error"}>
        <span>{L(c.email)}</span>
        <input name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
        {state.status === "error" ? <em className={s.error}>{state.message}</em> : null}
      </label>

      <div className={s.actions}>
        <button type="submit" className={s.submit} disabled={pending}>
          {pending ? L(c.sending) : L(c.submit)} <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
