"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminState } from "@/app/actions/admin";
import type { Lang } from "@/lib/i18n";
import s from "./admin.module.css";

const initial: AdminState = { status: "idle" };

/**
 * A form around one admin server action. Carries lang and the current
 * path as hidden fields (the action revalidates that path), shows a
 * pending label while submitting and the action's message afterwards.
 */
export function ActionForm({
  action,
  lang,
  path,
  submit,
  pending: pendingLabel,
  confirm,
  className,
  inline,
  children,
}: {
  action: (prev: AdminState, fd: FormData) => Promise<AdminState>;
  lang: Lang;
  path: string;
  submit: string;
  pending?: string;
  /** A question to confirm before submitting, e.g. for removals. */
  confirm?: string;
  className?: string;
  /** Render as a row: fields and button side by side. */
  inline?: boolean;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form
      action={formAction}
      className={`${inline ? s.inlineForm : s.form} ${className ?? ""}`}
      onSubmit={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined}
    >
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="path" value={path} />
      {children}
      <span className={s.submitRow}>
        <button type="submit" className={s.button} disabled={pending} data-quiet={inline || undefined}>
          {pending ? pendingLabel ?? submit : submit}
        </button>
        {state.status === "ok" ? (
          <span className={s.ok} role="status">{state.message}</span>
        ) : state.status === "error" ? (
          <span className={s.err} role="alert">{state.message}</span>
        ) : null}
      </span>
    </form>
  );
}
