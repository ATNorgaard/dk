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

/**
 * The origin the visitor is talking to, so the magic link comes back to the
 * same host. Proxies may send comma-separated host lists; the first entry is
 * the one the visitor used. The scheme is decided by the host, not by a
 * forwarded header: everything that is not localhost is https, because
 * Supabase matches the address against its allow-list as text and an
 * "http://www…" address is rejected and replaced by the bare site URL.
 * A default port is dropped for the same reason ("host:443" is not "host").
 */
async function requestOrigin() {
  const h = await headers();
  const first = (v: string | null) => v?.split(",")[0]?.trim() || null;
  let host = first(h.get("x-forwarded-host")) ?? first(h.get("host")) ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.");
  const proto = local ? "http" : "https";
  if ((proto === "https" && host.endsWith(":443")) || (proto === "http" && host.endsWith(":80"))) {
    host = host.replace(/:\d+$/, "");
  }
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
  // The destination rides in the URL path, not the query, so the redirect
  // address is a clean URL that the allow-list glob (host + /**) matches;
  // a query string here made Supabase reject it and fall back to the site
  // URL. The mail links through Supabase's own /auth/v1/verify endpoint
  // ({{ .ConfirmationURL }}), which then redirects here with ?code=.
  const emailRedirectTo = `${origin}/auth/callback${next}`;
  console.info("magic link requested, return address", emailRedirectTo);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Accounts are created by the house (roles script, later the admin), never by the form.
      shouldCreateUser: false,
      emailRedirectTo,
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
  // Local: only this browser's session. The default scope revokes every
  // session of the user, which left other browsers with a token the proxy
  // still trusted and the auth server no longer did, and that looped between
  // the portal and the login page.
  await supabase.auth.signOut({ scope: "local" });
  redirect(href(lang));
}
