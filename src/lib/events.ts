import { createHash } from "node:crypto";
import { createPublicClient } from "@/lib/supabase/public";
import type { Lang } from "@/lib/i18n";

export type EventType =
  | "page_view"
  | "domain_view"
  | "house_window"
  | "house_inside"
  | "application"
  | "contact"
  | "access_request"
  | "booking_created"
  | "booking_first_reply";

export type EventInput = {
  type: EventType;
  path: string;
  lang?: Lang | null;
  domain_id?: string | null;
  referrer_host?: string | null;
  /** Anything stable for one visitor within a day (e.g. IP + UA). Hashed with a daily salt; never stored raw. */
  visitorSeed?: string | null;
};

/**
 * First-party analytics. Nothing here identifies a person: the visitor key
 * is a salted hash that changes every day, so it can count unique visitors
 * per day and nothing more. Failures are swallowed; analytics must never
 * break a page or a form.
 */
export async function recordEvent(input: EventInput) {
  try {
    const supabase = createPublicClient();
    const day = new Date().toISOString().slice(0, 10);
    const salt = process.env.EVENTS_SALT ?? "trustusconsult";
    const visitor_day = input.visitorSeed
      ? createHash("sha256").update(`${salt}:${day}:${input.visitorSeed}`).digest("hex").slice(0, 16)
      : null;
    await supabase.from("events").insert({
      type: input.type,
      path: input.path.slice(0, 300),
      lang: input.lang ?? null,
      domain_id: input.domain_id ?? null,
      referrer_host: input.referrer_host?.slice(0, 120) ?? null,
      visitor_day,
    });
  } catch {
    /* analytics is best-effort */
  }
}
