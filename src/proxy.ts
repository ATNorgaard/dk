import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, LANGS, isLang } from "@/lib/i18n";
import { refreshSession } from "@/lib/supabase/proxy";

/**
 * Two jobs before a request reaches a page:
 *  1. Language in the path: /da (default) and /en. A request without a
 *     language prefix is redirected to the visitor's preferred language, read
 *     from the Accept-Language header.
 *  2. Session: refresh the Supabase auth cookies and keep signed-out visitors
 *     out of /[lang]/portal and /[lang]/admin. This is only the optimistic
 *     check; pages verify the user and their roles again (lib/auth.ts).
 * Static assets, API routes and /auth/* (the magic-link callback) are excluded.
 */
function preferredLang(request: NextRequest) {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return DEFAULT_LANG;
}

const GUARDED = ["portal", "admin"];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const [, first, second] = pathname.split("/");

  // A sign-in code that landed anywhere but the callback: Supabase fell
  // back to the site URL because the return address the form asked for was
  // not on its allow-list (typically a dev server on an unlisted port).
  // Forward it to the callback so the visitor is never left on the landing
  // page with a code in the address bar. The exchange still needs the
  // verifier cookie of the browser that asked, so a cross-host request ends
  // on the login page with a clear error rather than a silent nothing.
  if (searchParams.has("code") || searchParams.has("token_hash")) {
    const url = request.nextUrl.clone();
    url.pathname = `/auth/callback/${isLang(first) ? first : DEFAULT_LANG}/portal`;
    url.search = "";
    for (const key of ["code", "token_hash", "type"]) {
      const v = searchParams.get(key);
      if (v) url.searchParams.set(key, v);
    }
    return NextResponse.redirect(url);
  }

  if (!isLang(first)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLang(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const { response, userId } = await refreshSession(request);
  const guarded = GUARDED.includes(second ?? "");
  const atLogin = second === "log-ind";

  if (guarded && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = `/${first}/log-ind`;
    url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
    return withCookies(NextResponse.redirect(url), response);
  }
  if (atLogin && userId) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next && LANGS.some((l) => next.startsWith(`/${l}/`)) ? next.split("?")[0] : `/${first}/portal`;
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }
  return response;
}

/** A redirect must carry any refreshed session cookies along. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes, the auth callback and files with an extension.
    "/((?!_next|api|auth|.*\\..*).*)",
  ],
};
