import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getViewer, hasRole } from "@/lib/auth";

/**
 * CV import for Min side. The signed-in specialist posts a PDF (multipart
 * "file") or pasted text ("text"), and Claude returns a proposal in the
 * profile's shape, in both languages. Nothing is saved here: the browser
 * shows the proposal and the specialist approves it with applyImport.
 * Needs ANTHROPIC_API_KEY on the server; without it the route says so.
 */
export const runtime = "nodejs";
export const maxDuration = 120;

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
Dates: ISO YYYY-MM-DD. Skills: short noun phrases, the same list in both languages.`;

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !hasRole(viewer, "specialist", "board", "admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const text = typeof form.get("text") === "string" ? (form.get("text") as string).trim().slice(0, 60_000) : "";

  const content: Anthropic.ContentBlockParam[] = [];
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return NextResponse.json({ error: "pdf_only" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
  }
  if (text) content.push({ type: "text", text: `CV or LinkedIn export:\n\n${text}` });
  if (content.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });
  content.push({ type: "text", text: "Fill the profile fields from this CV." });

  const client = new Anthropic();
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(Proposal) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: "no_proposal" }, { status: 502 });
    }
    return NextResponse.json({ proposal: response.parsed_output });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (e instanceof Anthropic.APIError) {
      console.error("cv-import api error", e.status, e.message);
      return NextResponse.json({ error: "api_error" }, { status: 502 });
    }
    console.error("cv-import failed", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
