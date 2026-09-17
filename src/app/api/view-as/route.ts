import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getRealViewer, isViewAs, VIEW_AS_COOKIE } from "@/lib/auth";

/**
 * "Se som" for admins. GET tells the switcher whether to show itself and
 * which view is active; POST {view} sets the cookie ("" clears it). The
 * pages read the cookie through getViewer on their next render.
 */
export const runtime = "nodejs";

export async function GET() {
  const viewer = await getRealViewer();
  const admin = !!viewer?.roles.includes("admin");
  const view = admin ? ((await cookies()).get(VIEW_AS_COOKIE)?.value ?? "") : "";
  return NextResponse.json({ admin, view: isViewAs(view) ? view : "" });
}

export async function POST(request: NextRequest) {
  const viewer = await getRealViewer();
  if (!viewer?.roles.includes("admin")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { view?: string };
  const view = body.view ?? "";
  if (view && !isViewAs(view)) return NextResponse.json({ error: "unknown_view" }, { status: 400 });
  const store = await cookies();
  if (view) store.set(VIEW_AS_COOKIE, view, { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true });
  else store.delete(VIEW_AS_COOKIE);
  return NextResponse.json({ view });
}
