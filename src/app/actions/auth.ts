"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { href, isLang, safeInternalPath, type Lang } from "@/lib/i18n";
import { auth } from "@/content/auth";

export type LoginState = { status: "idle" } | { status: "sent" } | { status: "error"; message: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function str(fd: FormData, key: string, max = 300) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** The origin the visitor is talking to, so the magic link comes back to the same host. */
async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestMagicLink(_prev: LoginState, fd: FormData): Promise<LoginState> {
  const l = str(fd, "lang", 2);
  const lang: Lang = isLang(l) ? l : "da";
  const c = auth.login.errors;
  if (str(fd, "website", 200)) return { status: "sent" }; // honeypot

  const email = str(fd, "email", 200).toLowerCase();
  if (!EMAIL.test(email)) return { status: "error", message: c.email[lang] };

  const next = safeInternalPath(str(fd, "next", 300), href(lang, "/portal"));
  const origin = await requestOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Accounts are created by the house (roles script, later the admin), never by the form.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // Unknown address: say nothing different, so the form cannot be used to
    // find out who has access.
    if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) return { status: "sent" };
    if (error.status === 429) return { status: "error", message: c.rate[lang] };
    console.error("signInWithOtp failed", error.code, error.message);
    return { status: "error", message: c.failed[lang] };
  }
  return { status: "sent" };
}

export async function signOut(fd: FormData) {
  const l = str(fd, "lang", 2);
  const lang: Lang = isLang(l) ? l : "da";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(href(lang));
}
