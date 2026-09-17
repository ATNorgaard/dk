"use client";

import { useRef, useState } from "react";
import type { LinkedInProfile } from "@/lib/linkedin";
import { t, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";
import a from "@/components/admin/admin.module.css";

/** What the editor did with a loaded profile, for the message. */
export type FillResult = { experience: number; education: number; certifications: number };

/**
 * Upload the LinkedIn "Save to PDF" export and hand the parsed profile to
 * the editor, which fills its empty fields. The file never becomes part of
 * the profile form: this is a plain fetch to /api/linkedin-import.
 */
export function LinkedInImport({ lang, onLoaded }: { lang: Lang; onLoaded: (profile: LinkedInProfile) => FillResult }) {
  const c = specialists.minSide;
  const L = (v: { da: string; en: string }) => t(v, lang, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function run() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ kind: "error", text: L(c.importPickFile) });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/linkedin-import", { method: "POST", body: fd });
      const body = (await res.json()) as { profile?: LinkedInProfile; error?: string };
      if (!res.ok || !body.profile) {
        setMessage({ kind: "error", text: L(body.error === "not_linkedin" ? c.importNotLinkedIn : c.importFailed) });
        return;
      }
      const n = onLoaded(body.profile);
      setMessage({
        kind: "ok",
        text: L(c.importDone).replace("{exp}", String(n.experience)).replace("{edu}", String(n.education)).replace("{cert}", String(n.certifications)),
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setMessage({ kind: "error", text: L(c.importFailed) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={a.form}>
      <p className={a.hint}>
        {L(c.importIntro)}{" "}
        <a href="https://www.linkedin.com/help/linkedin/answer/a541960" target="_blank" rel="noreferrer">
          {L(c.importHelp)} ↗
        </a>
      </p>
      <p className={a.notice}>{L(c.importDisclaimer)}</p>
      <div className={a.inlineForm}>
        <label className={a.field}>
          <span>{L(c.importFile)}</span>
          <input ref={fileRef} type="file" accept="application/pdf" />
        </label>
        <span className={a.submitRow}>
          <button type="button" className={a.button} disabled={busy} data-quiet onClick={run}>
            {busy ? L(c.importRunning) : L(c.importRun)}
          </button>
          {message ? (
            <span className={message.kind === "ok" ? a.ok : a.err} role={message.kind === "ok" ? "status" : "alert"}>
              {message.text}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
