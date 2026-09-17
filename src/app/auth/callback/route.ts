import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isLang, safeInternalPath, type Lang } from "@/lib/i18n";

const OTP_TYPES: EmailOtpType[] = ["magiclink", "email", "invite", "recovery", "signup", "email_change"];

/**
 * Where the magic link lands. Two shapes are accepted:
 *  - token_hash + type, from our email template. Works in any browser.
 *  - code, the PKCE shape Supabase's default template produces. Works only in
 *    the browser that asked for the link.
 * On success the session cookies are set and the visitor goes to `next`;
 * on failure back to the login page with an error flag.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeInternalPath(params.get("next"), "/da/portal");
  const lang = langOf(next);
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  const supabase = await createClient();
  let failed = true;
  if (tokenHash && type && OTP_TYPES.includes(type as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    failed = !!error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
  }

  const url = request.nextUrl.clone();
  url.search = "";
  if (failed) {
    url.pathname = `/${lang}/log-ind`;
    url.search = `?error=link&next=${encodeURIComponent(next)}`;
  } else {
    url.pathname = next.split("?")[0];
    const q = next.split("?")[1];
    if (q) url.search = `?${q}`;
  }
  return NextResponse.redirect(url);
}

function langOf(path: string): Lang {
  const l = path.split("/")[1];
  return isLang(l) ? l : "da";
}
