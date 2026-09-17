"use client";

import { useActionState, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { saveProfile } from "@/app/actions/profile";
import type { AdminState } from "@/app/actions/admin";
import type { Certification, Education, Experience, Profile } from "@/lib/specialists";
import { t, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";
import s from "./profile.module.css";

/**
 * The whole profile in one form with one save. Experience, education and
 * certifications are lists the specialist adds to and removes from locally;
 * nothing reaches the server until "Gem ændringer" (or Ctrl+S). The action
 * writes the profile columns and replaces the three lists in one go.
 *
 * Inputs are uncontrolled: rows carry a stable key so removing one in the
 * middle keeps the others' typed values, and the field names are re-indexed
 * from the array on each render so the server reads a contiguous list.
 */
const initial: AdminState = { status: "idle" };
type I18n = { da: string; en: string };
type Keyed<T> = T & { key: string };

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
}
/** Rows as the editor holds them: the DB id becomes the React key, sort order is the array order. */
function keyed<T extends { id: string }>(rows: T[]): Keyed<Omit<T, "id" | "sort_order">>[] {
  return rows.map((r) => ({ ...r, key: r.id }));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={a.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ProfileEditor({
  lang,
  path,
  profile,
  experience,
  education,
  certifications,
}: {
  lang: Lang;
  path: string;
  profile: Profile;
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
}) {
  const c = specialists.minSide;
  const L = (v: I18n) => t(v, lang, "");
  const [state, formAction, pending] = useActionState(saveProfile, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // "Dirty" is remembered together with the action result it was set under:
  // a newer successful result means the edits went through.
  const [edited, setEdited] = useState<{ on: boolean; under: AdminState }>({ on: false, under: initial });
  const dirty = edited.on && (edited.under === state || state.status !== "ok");
  const markDirty = () => setEdited({ on: true, under: state });

  const [exp, setExp] = useState(() => keyed(experience));
  const [edu, setEdu] = useState(() => keyed(education));
  const [cert, setCert] = useState(() => keyed(certifications));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function add<T>(set: Dispatch<SetStateAction<Keyed<T>[]>>, row: NoInfer<T>) {
    set((rows) => [...rows, { ...row, key: newKey() }]);
    markDirty();
  }
  function remove<T>(set: Dispatch<SetStateAction<Keyed<T>[]>>, key: string) {
    set((rows) => rows.filter((r) => r.key !== key));
    markDirty();
  }

  const pair = (name: string, label: string, values: I18n | null | undefined, kind: "input" | "textarea" = "input", rows = 4) => (
    <div className={s.line} data-cols="pair">
      {(["da", "en"] as const).map((l) =>
        kind === "input" ? (
          <Field key={l} label={`${label} · ${l.toUpperCase()}`}>
            <input name={`${name}_${l}`} defaultValue={values?.[l] ?? ""} />
          </Field>
        ) : (
          <Field key={l} label={`${label} · ${l.toUpperCase()}`}>
            <textarea name={`${name}_${l}`} defaultValue={values?.[l] ?? ""} rows={rows} />
          </Field>
        ),
      )}
    </div>
  );

  const pr = profile;

  return (
    <form ref={formRef} action={formAction} className={s.editor} onChange={markDirty}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="path" value={path} />

      <section className={p.section}>
        <h2>{L(c.sections.basics)}</h2>
        {pair("title", L(c.fields.title), pr.title)}
        {pair("tagline", L(c.fields.tagline), pr.tagline)}
        <div className={s.line} data-cols="pair">
          <Field label={L(c.fields.city)}>
            <input name="city" defaultValue={pr.city ?? ""} />
          </Field>
          <Field label={L(c.fields.years)}>
            <input name="years_in_craft" type="number" min={0} max={60} defaultValue={pr.years_in_craft ?? ""} className={a.narrow} />
          </Field>
        </div>
      </section>

      <section className={p.section}>
        <h2>{L(c.sections.about)}</h2>
        {pair("summary", L(c.fields.summary), pr.summary, "textarea", 6)}
        {pair("skills", L(c.fields.skills), { da: (pr.skills?.da ?? []).join("\n"), en: (pr.skills?.en ?? []).join("\n") }, "textarea", 4)}
        <Field label={L(c.fields.languages)}>
          <input name="languages" defaultValue={pr.languages.join(", ")} />
        </Field>
      </section>

      <section className={p.section}>
        <h2>{L(c.sections.availability)}</h2>
        <div className={s.line} data-cols="four">
          <Field label={L(c.fields.rate)}>
            <input name="rate_text" defaultValue={pr.rate_text ?? ""} placeholder="1.450 kr./time" />
          </Field>
          <Field label={L(c.fields.weeklyHours)}>
            <input name="weekly_hours" type="number" min={0} max={60} defaultValue={pr.weekly_hours ?? ""} />
          </Field>
          <Field label={L(c.fields.availableFrom)}>
            <input name="available_from" type="date" defaultValue={pr.available_from ?? ""} />
          </Field>
          <Field label={L(c.fields.bookedUntil)}>
            <input name="booked_until" type="date" defaultValue={pr.booked_until ?? ""} />
          </Field>
        </div>
      </section>

      <section className={p.section}>
        <h2>{L(c.sections.links)}</h2>
        <div className={s.line} data-cols="three">
          <Field label={L(c.fields.linkedin)}>
            <input name="linkedin_url" defaultValue={pr.linkedin_url ?? ""} placeholder="https://www.linkedin.com/in/…" />
          </Field>
          <Field label={L(c.fields.website)}>
            <input name="website_url" defaultValue={pr.website_url ?? ""} placeholder="https://" />
          </Field>
          <Field label={L(c.fields.slug)}>
            <input name="slug" defaultValue={pr.slug} pattern="[a-z0-9-]{3,80}" />
          </Field>
        </div>
      </section>

      <section className={p.section}>
        <h2>{L(c.sections.experience)}</h2>
        <div className={s.rows}>
          {exp.map((e, i) => (
            <div key={e.key} className={s.row}>
              <div className={s.line} data-cols="org">
                <Field label={L(c.fields.organisation)}>
                  <input name={`experience.${i}.organisation`} defaultValue={e.organisation} />
                </Field>
                <Field label={L(c.fields.from)}>
                  <input name={`experience.${i}.start_date`} type="date" defaultValue={e.start_date ?? ""} />
                </Field>
                <Field label={L(c.fields.to)}>
                  <input name={`experience.${i}.end_date`} type="date" defaultValue={e.end_date ?? ""} />
                </Field>
                <button type="button" className={s.remove} onClick={() => remove(setExp, e.key)} aria-label={`${L(c.remove)}: ${e.organisation || L(c.sections.experience)}`}>
                  {L(c.remove)}
                </button>
              </div>
              {pair(`experience.${i}.title`, L(c.fields.role), e.title)}
              {pair(`experience.${i}.description`, L(c.fields.description), e.description, "textarea", 2)}
            </div>
          ))}
        </div>
        <button type="button" className={a.button} data-quiet onClick={() => add(setExp, { organisation: "", title: { da: "", en: "" }, description: null, start_date: null, end_date: null })}>
          + {L(c.add)}
        </button>
      </section>

      <section className={p.section}>
        <h2>{L(c.sections.education)}</h2>
        <div className={s.rows}>
          {edu.map((e, i) => (
            <div key={e.key} className={s.row}>
              <div className={s.line} data-cols="edu">
                <Field label={L(c.fields.institution)}>
                  <input name={`education.${i}.institution`} defaultValue={e.institution} />
                </Field>
                <Field label={L(c.fields.startYear)}>
                  <input name={`education.${i}.start_year`} type="number" min={1950} max={2100} defaultValue={e.start_year ?? ""} />
                </Field>
                <Field label={L(c.fields.endYear)}>
                  <input name={`education.${i}.end_year`} type="number" min={1950} max={2100} defaultValue={e.end_year ?? ""} />
                </Field>
                <button type="button" className={s.remove} onClick={() => remove(setEdu, e.key)} aria-label={`${L(c.remove)}: ${e.institution || L(c.sections.education)}`}>
                  {L(c.remove)}
                </button>
              </div>
              {pair(`education.${i}.degree`, L(c.fields.degree), e.degree)}
            </div>
          ))}
        </div>
        <button type="button" className={a.button} data-quiet onClick={() => add(setEdu, { institution: "", degree: { da: "", en: "" }, start_year: null, end_year: null })}>
          + {L(c.add)}
        </button>
      </section>

      <section className={p.section}>
        <h2>{L(c.sections.certifications)}</h2>
        <div className={s.rows}>
          {cert.map((e, i) => (
            <div key={e.key} className={s.row}>
              <div className={s.line} data-cols="cert">
                <Field label={L(c.fields.certName)}>
                  <input name={`certifications.${i}.name`} defaultValue={e.name} />
                </Field>
                <Field label={L(c.fields.issuer)}>
                  <input name={`certifications.${i}.issuer`} defaultValue={e.issuer ?? ""} />
                </Field>
                <Field label={L(c.fields.year)}>
                  <input name={`certifications.${i}.year`} type="number" min={1950} max={2100} defaultValue={e.year ?? ""} />
                </Field>
                <button type="button" className={s.remove} onClick={() => remove(setCert, e.key)} aria-label={`${L(c.remove)}: ${e.name || L(c.sections.certifications)}`}>
                  {L(c.remove)}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className={a.button} data-quiet onClick={() => add(setCert, { name: "", issuer: null, year: null })}>
          + {L(c.add)}
        </button>
      </section>

      <div className={s.bar}>
        <button type="submit" className={a.button} disabled={pending}>
          {pending ? L(c.saving) : L(c.saveAll)}
        </button>
        {dirty ? (
          <span className={s.unsaved}>{L(c.unsaved)}</span>
        ) : state.status === "ok" ? (
          <span className={a.ok} role="status">{state.message}</span>
        ) : state.status === "error" ? (
          <span className={a.err} role="alert">{state.message}</span>
        ) : (
          <span className={a.hint}>{L(c.editorHint)}</span>
        )}
      </div>
    </form>
  );
}
