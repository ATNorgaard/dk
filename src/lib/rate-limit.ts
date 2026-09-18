import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting for the public forms, kept in Postgres (rate_events and the
 * rate_limit_hit function, 20260918090000_launch_prep.sql). Keys are salted
 * hashes of the client's IP and of the email address, never the raw values.
 *
 * Fails open: if the database call itself fails, the form goes through and
 * the failure is logged. A broken limiter must not block a real client.
 */
export type Limit = { max: number; windowSeconds: number };

const HOUR = 3600;
const DAY = 86400;

/** Per form: attempts per IP per hour, and per email address per day. */
export const LIMITS: Record<"application" | "access_request" | "contact" | "booking", { ip: Limit; email: Limit }> = {
  application: { ip: { max: 3, windowSeconds: HOUR }, email: { max: 2, windowSeconds: DAY } },
  access_request: { ip: { max: 5, windowSeconds: HOUR }, email: { max: 2, windowSeconds: DAY } },
  contact: { ip: { max: 5, windowSeconds: HOUR }, email: { max: 3, windowSeconds: HOUR } },
  booking: { ip: { max: 5, windowSeconds: HOUR }, email: { max: 3, windowSeconds: DAY } },
};

function hash(value: string) {
  const salt = process.env.EVENTS_SALT ?? "trustusconsult";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 24);
}

/** The requesting client's IP, as Vercel forwards it, or "unknown". */
async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Whether this attempt is allowed. Checks the IP window first, then the
 * email window; both are recorded when allowed.
 */
export async function allowed(scope: keyof typeof LIMITS, email: string | null): Promise<boolean> {
  const limits = LIMITS[scope];
  const checks: { key: string; limit: Limit }[] = [{ key: `ip:${hash(await clientIp())}`, limit: limits.ip }];
  if (email) checks.push({ key: `email:${hash(email.trim().toLowerCase())}`, limit: limits.email });
  try {
    const admin = createAdminClient();
    for (const c of checks) {
      const { data, error } = await admin.rpc("rate_limit_hit", {
        p_scope: scope,
        p_key: c.key,
        p_max: c.limit.max,
        p_window_seconds: c.limit.windowSeconds,
      });
      if (error) throw error;
      if (data === false) return false;
    }
    return true;
  } catch (e) {
    console.error("rate-limit: check failed, allowing", scope, e instanceof Error ? e.message : e);
    return true;
  }
}
