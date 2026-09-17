"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { setPortrait } from "@/app/actions/profile";
import type { AdminState } from "@/app/actions/admin";
import { t, type Lang } from "@/lib/i18n";
import { specialists } from "@/content/specialists";
import a from "@/components/admin/admin.module.css";

const initial: AdminState = { status: "idle" };

/**
 * Uploads a portrait straight from the browser into the portraits bucket
 * (RLS lets a person write only under their own folder), then records the
 * path on the profile through the setPortrait action.
 */
export function PortraitUpload({ lang, path, personId, current }: { lang: Lang; path: string; personId: string; current: string | null }) {
  const [state, formAction, pending] = useActionState(setPortrait, initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const pathField = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const c = specialists.minSide;

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${personId}/portrait-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("portraits").upload(objectPath, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      if (pathField.current) pathField.current.value = objectPath;
      setPreview(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portraits/${objectPath}`);
      formRef.current?.requestSubmit();
    } catch {
      setError(t(c.portraitFailed, lang, ""));
    } finally {
      setUploading(false);
    }
  }

  return (
    <form ref={formRef} action={formAction} className={a.inlineForm}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="path" value={path} />
      <input type="hidden" name="portrait_path" ref={pathField} defaultValue={current ?? ""} />
      {preview ? <Image src={preview} alt="" width={96} height={96} style={{ objectFit: "cover", borderRadius: 4 }} unoptimized /> : null}
      <label className={a.field}>
        <span>{t(c.sections.portrait, lang, "")}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || pending} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <span className={a.hint}>{t(c.portraitHint, lang, "")}</span>
      {uploading ? <span className={a.muted}>{t(c.uploading, lang, "")}</span> : null}
      {error ? <span className={a.err} role="alert">{error}</span> : null}
      {state.status === "ok" ? <span className={a.ok} role="status">{state.message}</span> : null}
      {state.status === "error" ? <span className={a.err} role="alert">{state.message}</span> : null}
    </form>
  );
}
