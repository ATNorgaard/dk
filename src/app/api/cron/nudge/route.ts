import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { bookingNudge } from "@/lib/email/templates";
import type { Lang } from "@/lib/i18n";

/**
 * Daily reminder for meeting requests without a first reply. Vercel Cron
 * calls this every morning (vercel.json) with the CRON_SECRET as a bearer
 * token. For every request that is still "requested", older than 20 hours
 * and not nudged in the last 20 hours, the specialist gets one mail and a
 * "nudged" event is written, so the next morning nudges again if nothing
 * happened. The response-time KPI depends on specialists replying; this is
 * the minimum that keeps it honest.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WAIT_HOURS = 20;

type Row = {
  id: string;
  full_name: string;
  company: string | null;
  duration_minutes: number;
  created_at: string;
  profile: { people: { display_name: string; email: string; lang: string } };
};

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const since = new Date(Date.now() - WAIT_HOURS * 3_600_000).toISOString();
  const { data, error } = await admin
    .from("booking_requests")
    .select("id, full_name, company, duration_minutes, created_at, profile:specialist_profiles!profile_id(people!person_id(display_name, email, lang))")
    .eq("status", "requested")
    .is("first_reply_at", null)
    .lt("created_at", since)
    .returns<Row[]>();
  if (error) {
    console.error("nudge: query failed", error.message);
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }
  const ids = (data ?? []).map((r) => r.id);
  const { data: recent } = ids.length
    ? await admin.from("booking_events").select("request_id").eq("type", "nudged").gte("at", since).in("request_id", ids).returns<{ request_id: string }[]>()
    : { data: [] as { request_id: string }[] };
  const skip = new Set((recent ?? []).map((r) => r.request_id));

  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host") ?? "www.trustusconsult.dk";
  const base = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  let sent = 0;
  for (const r of data ?? []) {
    if (skip.has(r.id) || !r.profile?.people?.email) continue;
    const lang: Lang = r.profile.people.lang === "en" ? "en" : "da";
    const hoursWaiting = Math.round((Date.now() - new Date(r.created_at).getTime()) / 3_600_000);
    const ok = await sendEmail(
      bookingNudge(lang, r.profile.people.email, {
        specialistName: r.profile.people.display_name,
        clientName: r.full_name,
        company: r.company,
        minutes: r.duration_minutes,
        hoursWaiting,
        minSideUrl: `${base}/${lang}/portal/min-side#moeder`,
      }),
    );
    if (ok) {
      await admin.from("booking_events").insert({ request_id: r.id, actor: "system", type: "nudged" });
      sent++;
    }
  }
  return NextResponse.json({ checked: data?.length ?? 0, sent });
}
