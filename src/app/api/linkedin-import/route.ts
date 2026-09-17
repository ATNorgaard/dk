import { NextResponse, type NextRequest } from "next/server";
import { getDocumentProxy, getMeta } from "unpdf";
import { getViewer, hasRole } from "@/lib/auth";
import { isLinkedInExport, linesFromTextRuns, parseLinkedInProfile, type PdfLine } from "@/lib/linkedin";

/**
 * Reads a LinkedIn "Save to PDF" export for Min side. The signed-in
 * specialist posts the file (multipart "file"); the reader in lib/linkedin
 * turns its fixed layout into profile fields, deterministically and without
 * any model. Nothing is saved here: the editor fills its empty fields with
 * the result and the specialist saves once.
 *
 * Errors: pdf_only, too_large, not_linkedin (the PDF was not made by
 * LinkedIn, or nothing recognisable was in it), unreadable.
 */
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, "specialist", "board", "admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "empty" }, { status: 400 });
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return NextResponse.json({ error: "pdf_only" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const meta = await getMeta(pdf);
    if (!isLinkedInExport(meta.info as Record<string, unknown> | undefined)) {
      return NextResponse.json({ error: "not_linkedin" }, { status: 422 });
    }
    const lines: PdfLine[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const runs = content.items.flatMap((it) => ("str" in it ? [{ str: it.str, transform: it.transform }] : []));
      lines.push(...linesFromTextRuns(p, runs));
    }
    const profile = parseLinkedInProfile(lines);
    if (!profile.name && !profile.experience.length) return NextResponse.json({ error: "not_linkedin" }, { status: 422 });
    return NextResponse.json({ profile });
  } catch (e) {
    console.error("linkedin-import failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "unreadable" }, { status: 400 });
  }
}
