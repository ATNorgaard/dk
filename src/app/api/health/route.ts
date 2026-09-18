import { NextResponse, type NextRequest } from "next/server";

/**
 * Health check, and the deliberate test error from the go-live checklist:
 * GET /api/health?boom=1 with the CRON_SECRET as bearer token throws, so
 * the error path (src/instrumentation.ts → runtime log) can be verified in
 * production without touching a real page.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("boom") === "1") {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    throw new Error("Deliberate test error from /api/health?boom=1");
  }
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
