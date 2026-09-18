import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runRetention } from "@/lib/retention";

/**
 * Daily retention run (vercel.json, 04:00 UTC) with CRON_SECRET as bearer
 * token. `?dry=1` reports what would be deleted without deleting. The
 * rules and periods live in src/lib/retention.ts; the response and the
 * log line carry the counts per rule.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get("dry") === "1";
  try {
    const report = await runRetention(createAdminClient(), dry);
    console.log(JSON.stringify({ level: "info", job: "retention", dry, at: new Date().toISOString(), report }));
    return NextResponse.json({ dry, report });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", job: "retention", dry, message: e instanceof Error ? e.message : String(e) }));
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
