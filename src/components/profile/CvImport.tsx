"use client";

import { useActionState, useState } from "react";
import { applyImport, type ImportProposal } from "@/app/actions/profile";
import type { AdminState } from "@/app/actions/admin";
import { t, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";
import a from "@/components/admin/admin.module.css";

const initial: AdminState = { status: "idle" };

/**
 * Upload a PDF or paste text, get a proposal back from /api/cv-import, show
 * it, and let the specialist apply it (applyImport fills only empty fields).
 */
export function CvImport({ lang, path }: { lang: Lang; path: string }) {
  const [proposal, setProposal] = useState<ImportProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(applyImport, initial);
  const c = specialists.minSide;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  async function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setProposal(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/cv-import", { method: "POST", body: fd });
      const body = (await res.json()) as { proposal?: ImportProposal; error?: string };
      if (res.status === 503) setError(L(c.importUnavailable));
      else if (!res.ok || !body.proposal) setError(L(c.importFailed));
      else setProposal(body.proposal);
    } catch {
      setError(L(c.importFailed));
    } finally {
      setBusy(false);
    }
  }

  const pick = (v?: { da: string; en: string }) => (v ? t(v, lang, "") : "");

  return (
    <div className={a.form}>
      <p className={a.notice}>{L(c.importDisclaimer)}</p>
      <p className={a.hint}>{L(c.importIntro)}</p>
      <form onSubmit={run} className={a.form}>
        <div className={a.grid2}>
          <label className={a.field}>
            <span>PDF</span>
            <input type="file" name="file" accept="application/pdf" />
          </label>
          <label className={a.field}>
            <span>{L(c.importPaste)}</span>
            <textarea name="text" rows={6} />
          </label>
        </div>
        <span className={a.submitRow}>
          <button type="submit" className={a.button} disabled={busy} data-quiet>
            {busy ? L(c.importRunning) : L(c.importRun)}
          </button>
          {error ? <span className={a.err} role="alert">{error}</span> : null}
        </span>
      </form>

      {proposal ? (
        <div className={a.card}>
          <dl className={a.dl}>
            {proposal.title ? (<><dt>{L(c.fields.title)}</dt><dd>{pick(proposal.title)}</dd></>) : null}
            {proposal.tagline ? (<><dt>{L(c.fields.tagline)}</dt><dd>{pick(proposal.tagline)}</dd></>) : null}
            {proposal.city ? (<><dt>{L(c.fields.city)}</dt><dd>{proposal.city}</dd></>) : null}
            {typeof proposal.years_in_craft === "number" ? (<><dt>{L(c.fields.years)}</dt><dd>{proposal.years_in_craft}</dd></>) : null}
            {proposal.summary ? (<><dt>{L(c.fields.summary)}</dt><dd>{pick(proposal.summary)}</dd></>) : null}
            {proposal.skills ? (<><dt>{L(c.sections.about)}</dt><dd>{(lang === "da" ? proposal.skills.da : proposal.skills.en).join(", ")}</dd></>) : null}
            {proposal.experience?.length ? (
              <>
                <dt>{L(c.sections.experience)}</dt>
                <dd>{proposal.experience.map((e) => `${pick(e.title)} · ${e.organisation}${e.start_date ? ` (${e.start_date.slice(0, 4)}–${e.end_date ? e.end_date.slice(0, 4) : "…"})` : ""}`).join("\n")}</dd>
              </>
            ) : null}
            {proposal.education?.length ? (<><dt>{L(c.sections.education)}</dt><dd>{proposal.education.map((e) => `${pick(e.degree)} · ${e.institution}`).join("\n")}</dd></>) : null}
            {proposal.certifications?.length ? (<><dt>{L(c.sections.certifications)}</dt><dd>{proposal.certifications.map((e) => e.name).join(", ")}</dd></>) : null}
          </dl>
          <form action={formAction} className={a.inlineForm}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="path" value={path} />
            <input type="hidden" name="proposal" value={JSON.stringify(proposal)} />
            <span className={a.submitRow}>
              <button type="submit" className={a.button} disabled={pending}>
                {pending ? L(c.saving) : L(c.importApply)}
              </button>
              {state.status === "ok" ? <span className={a.ok} role="status">{state.message}</span> : null}
              {state.status === "error" ? <span className={a.err} role="alert">{state.message}</span> : null}
            </span>
          </form>
        </div>
      ) : null}
    </div>
  );
}
