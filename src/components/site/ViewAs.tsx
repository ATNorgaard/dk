"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";
import { auth } from "@/content/auth";
import s from "./view-as.module.css";

type View = "" | "board" | "specialist" | "client" | "visitor";

/**
 * "Se som": a small selector next to the header logo, shown only to admins,
 * that lets them look at the site as board, specialist, client or visitor.
 * Mounted from the language layout and hydrated from /api/view-as so the
 * static pages stay static; the server applies the choice in getViewer.
 */
export function ViewAs({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [state, setState] = useState<{ admin: boolean; view: View } | null>(null);
  const [busy, setBusy] = useState(false);
  const c = auth.viewAs;

  useEffect(() => {
    let alive = true;
    fetch("/api/view-as")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { admin: boolean; view: View } | null) => {
        if (alive && j) setState(j);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!state?.admin) return null;

  async function choose(view: View) {
    setBusy(true);
    try {
      const r = await fetch("/api/view-as", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ view }) });
      if (r.ok) {
        setState({ admin: true, view });
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className={s.pill} data-active={state.view ? "" : undefined}>
      <span>{t(c.label, lang, "")}</span>
      <select value={state.view} disabled={busy} onChange={(e) => choose(e.target.value as View)} aria-label={t(c.label, lang, "")}>
        <option value="">{t(c.options.admin, lang, "")}</option>
        <option value="board">{t(c.options.board, lang, "")}</option>
        <option value="specialist">{t(c.options.specialist, lang, "")}</option>
        <option value="client">{t(c.options.client, lang, "")}</option>
        <option value="visitor">{t(c.options.visitor, lang, "")}</option>
      </select>
    </label>
  );
}
