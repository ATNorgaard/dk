import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, LANGS, isLang } from "@/lib/i18n";

/**
 * Language in the path: /da (default) and /en. A request without a language
 * prefix is redirected to the visitor's preferred language, read from the
 * Accept-Language header. Static assets and API routes are excluded.
 */
function preferredLang(request: NextRequest) {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLang(code)) return code;
  }
  return DEFAULT_LANG;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLang = LANGS.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  );
  if (hasLang) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLang(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next internals, API routes and files with an extension.
    "/((?!_next|api|.*\\..*).*)",
  ],
};
