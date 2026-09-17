import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer, hasRole } from "@/lib/auth";

/**
 * CV import for Min side. The signed-in specialist posts a PDF (multipart
 * "file") or pasted text ("text"); the model returns a proposal in the
 * profile's shape, in both languages. Nothing is saved here: the browser
 * shows the proposal and the specialist approves it with applyImport.
 *
 * Talks to OpenRouter (OpenAI-style chat completions) with plain fetch, so
 * the model behind it is one env var: OPENROUTER_MODEL, default Claude Opus 5.
 * Needs OPENROUTER_API_KEY on the server; without it the route says so.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_MODEL = "anthropic/claude-opus-5";

const I18n = z.object({ da: z.string(), en: z.string() });

const Proposal = z.object({
  title: I18n.describe("Current role or professional title, short"),
  tagline: I18n.describe("One line, max 120 characters, what they do for clients; first person is fine"),
  city: z.string().describe("City of residence or work, or empty"),
  years_in_craft: z.number().int().min(0).max(60).describe("Years of professional experience in the craft, estimated from the CV"),
  summary: I18n.describe("About text, 3 to 6 sentences, third person, factual, no superlatives"),
  skills: z.object({ da: z.array(z.string()), en: z.array(z.string()) }).describe("6 to 15 skills, short noun phrases, same items in both languages"),
  languages: z.array(z.string()).describe("Languages they work in as ISO 639-1 codes, e.g. da, en, de"),
  experience: z
    .array(
      z.object({
        organisation: z.string(),
        title: I18n,
        description: I18n.describe("1 to 3 sentences, or empty strings"),
        start_date: z.string().describe("YYYY-MM-DD; use the first of the month when only month or year is known; empty if unknown"),
        end_date: z.string().describe("YYYY-MM-DD, or empty when ongoing or unknown"),
      }),
    )
    .describe("Most recent first, max 12"),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: I18n,
        start_year: z.number().int().min(1950).max(2100).nullable(),
        end_year: z.number().int().min(1950).max(2100).nullable(),
      }),
    )
    .describe("Most recent first"),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), year: z.number().int().min(1950).max(2100).nullable() })),
});

const SYSTEM = `You turn a specialist's CV into the fields of a profile in a Danish consultancy collective (TrustUsConsult).
Write every text field in both Danish (da) and English (en); translate faithfully, do not invent facts.
Keep the person's own claims; do not add achievements that are not in the source. Empty string when the source says nothing.
Dates: ISO YYYY-MM-DD. Skills: short noun phrases, the same list in both languages.
Answer with the JSON object only.`;

type Part = { type: "text"; text: string } | { type: "file"; file: { filename: string; file_data: string } };

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, "specialist", "board", "admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const form = await request.formData();
  const file = form.get("file");
  const text = typeof form.get("text") === "string" ? (form.get("text") as string).trim().slice(0, 60_000) : "";

  const parts: Part[] = [];
  let hasPdf = false;
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return NextResponse.json({ error: "pdf_only" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    parts.push({ type: "file", file: { filename: "cv.pdf", file_data: `data:application/pdf;base64,${data}` } });
    hasPdf = true;
  }
  if (text) parts.push({ type: "text", text: `CV or LinkedIn export:\n\n${text}` });
  if (parts.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });
  parts.push({ type: "text", text: "Fill the profile fields from this CV." });

  const body = {
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: parts },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "profile_proposal", strict: true, schema: z.toJSONSchema(Proposal) },
    },
    // Let the model read the PDF itself (Claude handles PDFs natively).
    ...(hasPdf ? { plugins: [{ id: "file-parser", pdf: { engine: "native" } }] } : {}),
    max_tokens: 8000,
  };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://www.trustusconsult.dk",
        "X-Title": "TrustUsConsult CV import",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(110_000),
    });
    if (res.status === 429) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (!res.ok) {
      console.error("cv-import: openrouter", res.status, (await res.text()).slice(0, 300));
      return NextResponse.json({ error: "api_error" }, { status: 502 });
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "no_proposal" }, { status: 502 });
    const parsed = Proposal.safeParse(JSON.parse(content));
    if (!parsed.success) {
      console.error("cv-import: proposal did not match the schema", parsed.error.issues.slice(0, 3));
      return NextResponse.json({ error: "no_proposal" }, { status: 502 });
    }
    return NextResponse.json({ proposal: parsed.data });
  } catch (e) {
    console.error("cv-import failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
