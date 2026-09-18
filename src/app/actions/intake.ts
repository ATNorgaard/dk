"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { isLang, type Lang } from "@/lib/i18n";
import { recordEvent } from "@/lib/events";
import { allowed } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { notify, sendEmail } from "@/lib/email";
import {
  accessRequestReceived,
  applicationReceived,
  contactReceived,
  newAccessRequestNotice,
  newApplicationNotice,
  newContactNotice,
} from "@/lib/email/templates";

export type FormState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string; fields?: Record<string, string> };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const copy = {
  da: {
    required: "Udfyld feltet.",
    email: "Skriv en gyldig e-mailadresse.",
    consent: "Du skal acceptere, at vi behandler dine oplysninger.",
    domain: "Vælg et domæne, eller skriv dit fag.",
    failed: "Vi kunne ikke sende din henvendelse. Prøv igen, eller skriv direkte til os.",
    tooShort: "Skriv lidt mere.",
    tooMany: "For mange forsøg på kort tid. Vent lidt, og prøv igen, eller skriv direkte til os.",
  },
  en: {
    required: "This field is required.",
    email: "Enter a valid email address.",
    consent: "You need to accept that we process your details.",
    domain: "Pick a domain or name your craft.",
    failed: "We could not send your message. Try again, or email us directly.",
    tooShort: "Write a little more.",
    tooMany: "Too many attempts in a short time. Wait a little and try again, or email us directly.",
  },
};

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function langOf(fd: FormData): Lang {
  const l = str(fd, "lang", 2);
  return isLang(l) ? l : "da";
}

/** A hidden field that humans never fill. Bots do. */
function isBot(fd: FormData) {
  return str(fd, "website", 200).length > 0;
}

export async function submitApplication(_prev: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const c = copy[lang];
  if (isBot(fd)) return { status: "ok" };

  const fields: Record<string, string> = {};
  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email", 200);
  const domain_id = str(fd, "domain_id", 40) || null;
  const craft = str(fd, "craft", 200) || null;
  const years = str(fd, "years_in_craft", 3);
  const consent = fd.get("consent") === "on";

  if (full_name.length < 2) fields.full_name = c.required;
  if (!EMAIL.test(email)) fields.email = c.email;
  if (!domain_id && !craft) fields.domain_id = c.domain;
  if (!consent) fields.consent = c.consent;
  if (Object.keys(fields).length) return { status: "error", message: "", fields };

  if (!(await allowed("application", email))) return { status: "error", message: c.tooMany };

  const supabase = createPublicClient();
  const { error } = await supabase.from("applications").insert({
    lang,
    domain_id,
    craft,
    full_name,
    email,
    phone: str(fd, "phone", 40) || null,
    linkedin_url: str(fd, "linkedin_url", 300) || null,
    years_in_craft: years ? Number(years) : null,
    cases: str(fd, "cases") || null,
    reference_note: str(fd, "reference_note", 1000) || null,
    message: str(fd, "message") || null,
    consent_at: new Date().toISOString(),
  });
  if (error) return { status: "error", message: c.failed };

  await Promise.all([
    recordEvent({ type: "application", path: `/${lang}/freelancere`, lang, domain_id }),
    sendEmail(applicationReceived(lang, email, full_name)),
    sendEmail(
      newApplicationNotice(notify.applications, {
        name: full_name,
        email,
        domain: domain_id,
        craft,
        years: years ? Number(years) : null,
      }),
    ),
  ]);
  return { status: "ok" };
}

/** The form behind the CV gate on a specialist page: ask the board for client access. */
export async function submitAccessRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const c = copy[lang];
  if (isBot(fd)) return { status: "ok" };

  const fields: Record<string, string> = {};
  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email", 200).toLowerCase();
  const message = str(fd, "message", 2000);
  const consent = fd.get("consent") === "on";

  if (full_name.length < 2) fields.full_name = c.required;
  if (!EMAIL.test(email)) fields.email = c.email;
  if (message.length < 5) fields.message = c.tooShort;
  if (!consent) fields.consent = c.consent;
  if (Object.keys(fields).length) return { status: "error", message: "", fields };

  if (!(await allowed("access_request", email))) return { status: "error", message: c.tooMany };

  const company = str(fd, "company", 160) || null;
  const source_slug = str(fd, "source_slug", 80) || null;
  const supabase = createPublicClient();
  const { error } = await supabase.from("access_requests").insert({
    lang,
    full_name,
    email,
    company,
    message,
    source_slug,
    consent_at: new Date().toISOString(),
  });
  if (error) return { status: "error", message: c.failed };

  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0]?.trim() ?? h.get("host") ?? "www.trustusconsult.dk";
  const adminUrl = `${host.startsWith("localhost") ? "http" : "https"}://${host}/da/admin/adgang`;
  await Promise.all([
    recordEvent({ type: "access_request", path: source_slug ? `/${lang}/specialister/${source_slug}` : `/${lang}`, lang }),
    sendEmail(accessRequestReceived(lang, email, full_name)),
    sendEmail(newAccessRequestNotice(notify.contact, { name: full_name, email, company, message, sourceSlug: source_slug, adminUrl })),
  ]);
  return { status: "ok" };
}

export async function submitContact(_prev: FormState, fd: FormData): Promise<FormState> {
  const lang = langOf(fd);
  const c = copy[lang];
  if (isBot(fd)) return { status: "ok" };

  const fields: Record<string, string> = {};
  const full_name = str(fd, "full_name", 120);
  const email = str(fd, "email", 200);
  const message = str(fd, "message");
  const domain_id = str(fd, "domain_id", 40) || null;
  const consent = fd.get("consent") === "on";

  if (full_name.length < 2) fields.full_name = c.required;
  if (!EMAIL.test(email)) fields.email = c.email;
  if (message.length < 5) fields.message = c.tooShort;
  if (!consent) fields.consent = c.consent;
  if (Object.keys(fields).length) return { status: "error", message: "", fields };

  if (!(await allowed("contact", email))) return { status: "error", message: c.tooMany };

  const supabase = createPublicClient();
  const { error } = await supabase.from("contact_messages").insert({
    lang,
    domain_id,
    full_name,
    email,
    company: str(fd, "company", 160) || null,
    message,
    consent_at: new Date().toISOString(),
  });
  if (error) return { status: "error", message: c.failed };

  const company = str(fd, "company", 160) || null;
  await Promise.all([
    recordEvent({ type: "contact", path: str(fd, "path", 300) || `/${lang}`, lang, domain_id }),
    sendEmail(contactReceived(lang, email, full_name)),
    sendEmail(newContactNotice(notify.contact, { name: full_name, email, company, domain: domain_id, message })),
  ]);
  return { status: "ok" };
}
