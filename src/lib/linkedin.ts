/**
 * Deterministic reader for LinkedIn's "Save to PDF" export.
 *
 * LinkedIn renders the export with Apache FOP in a fixed layout: a sidebar
 * (contact, top skills, languages, certifications, honours) and a main column
 * (name, headline, location, summary, experience, education). Every element
 * has a fixed font size, so the reader classifies lines by size and column
 * rather than by guessing at words:
 *
 *   sidebar   x < 150   heading 13pt, items 10.5 to 11pt
 *   main      x > 150   name 26pt, headline and location 12pt, section
 *                       heading 15.8pt, company / institution 12pt, role
 *                       title 11.5pt, dates, location and body 10.5pt
 *
 * A wrapped line continues at about 1.2 times the font size; a new entry
 * starts after a larger gap. Section labels follow the member's LinkedIn
 * language; Danish and English are recognised. No text is invented: what
 * is not in the PDF stays empty.
 *
 * This module has no imports so it can be compiled and run on its own.
 */

/** One line of text with its position; built from pdf.js text runs. */
export type PdfLine = { page: number; x: number; y: number; size: number; text: string };

export type LinkedInProfile = {
  name: string;
  headline: string;
  location: string;
  email: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  summary: string;
  skills: string[];
  /** ISO 639-1 codes; names the reader does not know are dropped. */
  languages: string[];
  certifications: { name: string }[];
  experience: { organisation: string; title: string; start_date: string | null; end_date: string | null; location: string | null; description: string }[];
  education: { institution: string; degree: string; start_year: number | null; end_year: number | null }[];
};

const SIDEBAR_MAX_X = 150;
const FOOTER_MAX_SIZE = 9.5;

type SidebarKind = "contact" | "skills" | "languages" | "certifications" | "other";
const SIDEBAR_HEADINGS: Record<string, SidebarKind> = {
  kontakt: "contact",
  contact: "contact",
  "mest repræsenterede kompetencer": "skills",
  topkompetencer: "skills",
  "top skills": "skills",
  sprog: "languages",
  languages: "languages",
  certificeringer: "certifications",
  certifications: "certifications",
};

type MainKind = "summary" | "experience" | "education" | "other";
const MAIN_HEADINGS: Record<string, MainKind> = {
  resumé: "summary",
  resume: "summary",
  summary: "summary",
  erfaring: "experience",
  experience: "experience",
  uddannelse: "education",
  education: "education",
};

const MONTHS: Record<string, number> = {
  januar: 1, january: 1, februar: 2, february: 2, marts: 3, march: 3, april: 4, maj: 5, may: 5, juni: 6, june: 6,
  juli: 7, july: 7, august: 8, september: 9, oktober: 10, october: 10, november: 11, december: 12,
};
const PRESENT = /^(present|nu|i dag|nutid|nuværende|nuvarande|now)$/i;
const DURATION_ONLY = /^\d+\s+(år|years?|måneder?|months?)/i;

const LANGUAGE_CODES: Record<string, string> = {
  dansk: "da", danish: "da", engelsk: "en", english: "en", tysk: "de", german: "de", deutsch: "de",
  svensk: "sv", swedish: "sv", norsk: "no", norwegian: "no", fransk: "fr", french: "fr", spansk: "es", spanish: "es",
  italiensk: "it", italian: "it", hollandsk: "nl", nederlandsk: "nl", dutch: "nl", polsk: "pl", polish: "pl",
  finsk: "fi", finnish: "fi", portugisisk: "pt", portuguese: "pt", russisk: "ru", russian: "ru", arabisk: "ar", arabic: "ar",
  kinesisk: "zh", chinese: "zh", mandarin: "zh", japansk: "ja", japanese: "ja", islandsk: "is", icelandic: "is",
  græsk: "el", greek: "el", tyrkisk: "tr", turkish: "tr", ukrainsk: "uk", ukrainian: "uk", hindi: "hi", urdu: "ur",
};

function norm(s: string) {
  return s.replace(/\s+/g, " ").trim();
}
function key(s: string) {
  return norm(s).toLowerCase();
}
/** Join a wrapped line onto the previous text; a trailing hyphen means the word continues. */
function joinWrapped(prev: string, next: string) {
  if (!prev) return next;
  return /[a-zæøå]-$/i.test(prev) && /^[a-zæøå]/.test(next) ? prev + next : `${prev} ${next}`;
}
/** Vertical distance between two lines; lines on different pages count as a fresh start. */
function gap(prev: PdfLine | null, line: PdfLine) {
  if (!prev || prev.page !== line.page) return Infinity;
  return prev.y - line.y;
}
function continues(prev: PdfLine | null, line: PdfLine) {
  return gap(prev, line) <= line.size * 1.4;
}

function parseMonthYear(text: string): string | null {
  const t = key(text);
  let m = t.match(/^([a-zæøå]+)\s+(\d{4})$/);
  if (m && MONTHS[m[1]]) return `${m[2]}-${String(MONTHS[m[1]]).padStart(2, "0")}-01`;
  m = t.match(/^(\d{4})$/);
  if (m) return `${m[1]}-01-01`;
  return null;
}
/** "august 2025 - Present (1 år)" → dates; null when the line is not a date range. */
function parseDateRange(text: string): { start: string | null; end: string | null } | null {
  const parts = norm(text).replace(/\s*\([^)]*\)\s*$/, "").split(/\s+[-–]\s+/);
  if (parts.length !== 2) return null;
  const start = parseMonthYear(parts[0]);
  if (!start) return null;
  if (PRESENT.test(parts[1].trim())) return { start, end: null };
  const end = parseMonthYear(parts[1]);
  return end ? { start, end } : null;
}

function parseSidebar(lines: PdfLine[]): Pick<LinkedInProfile, "email" | "linkedin_url" | "website_url" | "skills" | "languages" | "certifications"> {
  const items: Record<SidebarKind, string[]> = { contact: [], skills: [], languages: [], certifications: [], other: [] };
  let section: SidebarKind | null = null;
  let heading: string[] = [];
  let prev: PdfLine | null = null;
  for (const line of lines) {
    if (line.size >= 12.5) {
      heading.push(line.text);
      section = null;
      prev = line;
      continue;
    }
    if (section === null) {
      section = SIDEBAR_HEADINGS[key(heading.join(" "))] ?? "other";
      heading = [];
    }
    const list = items[section];
    if (list.length && prev && prev.size < 12.5 && continues(prev, line)) list[list.length - 1] = joinWrapped(list[list.length - 1], line.text);
    else list.push(line.text);
    prev = line;
  }

  let email: string | null = null;
  let linkedin_url: string | null = null;
  let website_url: string | null = null;
  for (const raw of items.contact) {
    const text = norm(raw.replace(/\s*\([^)]*\)\s*$/, ""));
    if (/@/.test(text) && !email) email = text.replace(/\s+/g, "");
    else if (/linkedin\.com\/in\//i.test(text) && !linkedin_url) linkedin_url = withScheme(text.replace(/\s+/g, ""));
    else if (/^(https?:\/\/|www\.)|\.[a-z]{2,}(\/|$)/i.test(text) && !/^\+?[\d\s()-]+$/.test(text) && !website_url) website_url = withScheme(text.replace(/\s+/g, ""));
  }

  const languages: string[] = [];
  for (const raw of items.languages) {
    const name = key(raw.replace(/\s*\([^)]*\)\s*$/, ""));
    const code = LANGUAGE_CODES[name] ?? (/^[a-z]{2}$/.test(name) ? name : null);
    if (code && !languages.includes(code)) languages.push(code);
  }

  return {
    email,
    linkedin_url,
    website_url,
    skills: items.skills.map(norm).filter(Boolean),
    languages,
    certifications: items.certifications.map(norm).filter(Boolean).map((name) => ({ name })),
  };
}
function withScheme(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

type Role = LinkedInProfile["experience"][number] & { dated: boolean; expectLocation: boolean };

function parseMain(lines: PdfLine[]): Pick<LinkedInProfile, "name" | "headline" | "location" | "summary" | "experience" | "education"> {
  let name = "";
  const header: string[] = [];
  let summary = "";
  const experience: Role[] = [];
  const education: (LinkedInProfile["education"][number] & { degreeDone: boolean })[] = [];
  let section: MainKind | "header" = "header";
  let company = "";
  let prev: PdfLine | null = null;

  for (const line of lines) {
    // Section headings (15.8pt) switch the reader; anything else in the header block is name, headline, location.
    if (line.size >= 15 && line.size < 20) {
      section = MAIN_HEADINGS[key(line.text)] ?? "other";
      prev = line;
      continue;
    }
    if (line.size >= 20) {
      name = joinWrapped(name, line.text);
      prev = line;
      continue;
    }
    switch (section) {
      case "header": {
        // Headline and location share size and spacing, so they cannot be told
        // apart by layout; LinkedIn prints the location as the block's last line.
        header.push(line.text);
        break;
      }
      case "summary": {
        summary = summary ? (gap(prev, line) > line.size * 1.8 ? `${summary}\n\n${line.text}` : joinWrapped(summary, line.text)) : line.text;
        break;
      }
      case "experience": {
        const role = experience[experience.length - 1];
        if (line.size >= 11.8) {
          // Company name (12pt); wrapped names continue.
          company = prev && prev.size >= 11.8 && continues(prev, line) ? joinWrapped(company, line.text) : line.text;
        } else if (line.size >= 11.2) {
          // Role title (11.5pt).
          if (role && prev && prev.size >= 11.2 && prev.size < 11.8 && continues(prev, line)) role.title = joinWrapped(role.title, line.text);
          else experience.push({ organisation: company, title: line.text, start_date: null, end_date: null, location: null, description: "", dated: false, expectLocation: false });
        } else if (role) {
          // 10.5pt: the date range first, then possibly a location on the next line, then the description.
          const range = !role.dated ? parseDateRange(line.text) : null;
          if (range) {
            role.start_date = range.start;
            role.end_date = range.end;
            role.dated = true;
            role.expectLocation = true;
          } else if (role.expectLocation && gap(prev, line) <= line.size * 1.5) {
            role.location = line.text;
            role.expectLocation = false;
          } else if (!role.dated && DURATION_ONLY.test(line.text)) {
            // "4 år 3 måneder" under a company with several roles: not a role's own line.
          } else {
            role.expectLocation = false;
            role.description = role.description
              ? gap(prev, line) > line.size * 1.8
                ? `${role.description}\n\n${line.text}`
                : joinWrapped(role.description, line.text)
              : line.text;
          }
        }
        break;
      }
      case "education": {
        const entry = education[education.length - 1];
        if (line.size >= 11.8) {
          if (entry && !entry.degree && prev && prev.size >= 11.8 && continues(prev, line)) entry.institution = joinWrapped(entry.institution, line.text);
          else education.push({ institution: line.text, degree: "", start_year: null, end_year: null, degreeDone: false });
        } else if (entry && !entry.degreeDone) {
          // The degree line, possibly wrapped; a line after a larger gap is a description and is skipped.
          if (entry.degree && !continues(prev, line)) {
            entry.degreeDone = true;
          } else {
            const text = joinWrapped(entry.degree, line.text);
            const m = text.match(/\s*·?\s*\((\d{4})(?:\s*[-–]\s*(\d{4}))?\)\s*$/);
            if (m) {
              entry.degree = norm(text.slice(0, m.index));
              entry.start_year = m[2] ? Number(m[1]) : null;
              entry.end_year = Number(m[2] ?? m[1]);
              entry.degreeDone = true;
            } else {
              entry.degree = norm(text);
            }
          }
        }
        break;
      }
      case "other":
        break;
    }
    prev = line;
  }

  const location = header.length >= 2 ? header[header.length - 1] : "";
  const headline = norm(header.slice(0, header.length >= 2 ? -1 : undefined).reduce((acc, l) => joinWrapped(acc, l), ""));
  return {
    name: norm(name),
    headline,
    location: norm(location),
    summary: summary.trim(),
    experience: experience.map((r) => ({
      organisation: norm(r.organisation),
      title: norm(r.title),
      start_date: r.start_date,
      end_date: r.end_date,
      location: r.location,
      description: r.description.trim(),
    })),
    education: education.map((e) => ({ institution: norm(e.institution), degree: e.degree, start_year: e.start_year, end_year: e.end_year })),
  };
}

/** Read a LinkedIn export from its positioned lines. Pure; pass lines from every page. */
export function parseLinkedInProfile(input: PdfLine[]): LinkedInProfile {
  const lines = input
    .filter((l) => l.size > FOOTER_MAX_SIZE && l.text.trim())
    .map((l) => ({ ...l, text: norm(l.text) }))
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const sidebar = parseSidebar(lines.filter((l) => l.x < SIDEBAR_MAX_X));
  const main = parseMain(lines.filter((l) => l.x >= SIDEBAR_MAX_X));
  return { ...main, ...sidebar };
}

/** True when the PDF's metadata says LinkedIn made it. */
export function isLinkedInExport(info: Record<string, unknown> | undefined) {
  return info?.Author === "LinkedIn" || /generated from profile/i.test(String(info?.Subject ?? ""));
}

/** Group pdf.js text runs of one page into lines by their baseline. */
export function linesFromTextRuns(page: number, runs: { str: string; transform: number[] }[]): PdfLine[] {
  const rows = new Map<number, { x: number; size: number; parts: string[] }>();
  for (const run of runs) {
    if (!run.str) continue;
    const [a, , , d, x, y] = run.transform;
    const size = Math.abs(d) || Math.abs(a);
    const k = Math.round(y);
    const row = rows.get(k) ?? { x, size: 0, parts: [] };
    row.x = Math.min(row.x, x);
    row.size = Math.max(row.size, size);
    row.parts.push(run.str);
    rows.set(k, row);
  }
  return [...rows.entries()].map(([y, r]) => ({ page, x: r.x, y, size: r.size, text: r.parts.join("") }));
}
