import { NextResponse, type NextRequest } from "next/server";
import { isLang } from "@/lib/i18n";
import { recordEvent, type EventType } from "@/lib/events";

const TYPES: EventType[] = ["page_view", "domain_view", "house_window", "house_inside"];

/**
 * Beacon endpoint for the client. Accepts only the four view events; form
 * events are recorded server-side by the actions themselves. The IP and user
 * agent are used once to derive a daily visitor hash and never stored.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const type = typeof b.type === "string" && TYPES.includes(b.type as EventType) ? (b.type as EventType) : null;
  const path = typeof b.path === "string" && b.path.startsWith("/") ? b.path : null;
  if (!type || !path) return NextResponse.json({ ok: false }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  let referrer_host: string | null = null;
  const ref = request.headers.get("referer");
  if (ref) {
    try {
      const host = new URL(ref).host;
      if (host && host !== request.nextUrl.host) referrer_host = host;
    } catch {
      /* ignore bad referer */
    }
  }

  await recordEvent({
    type,
    path,
    lang: isLang(b.lang as string) ? (b.lang as "da" | "en") : null,
    domain_id: typeof b.domain_id === "string" && /^[a-z]{2,20}$/.test(b.domain_id) ? b.domain_id : null,
    referrer_host,
    visitorSeed: ip || ua ? `${ip}|${ua}` : null,
  });
  return NextResponse.json({ ok: true });
}
