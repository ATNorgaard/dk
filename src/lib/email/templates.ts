import type { Lang } from "@/lib/i18n";
import { site } from "@/content/site";
import type { Mail } from "./index";

/**
 * The mails the house sends. Each returns a Mail in the recipient's language.
 * Plain HTML with inline styles and a text alternative: transactional mail
 * should be readable everywhere and never depend on images.
 */

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, paragraphs: string[], footer: string) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("");
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;color:#1b1b1d;font:16px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto">
<p style="margin:0 0 20px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#1c589c">${esc(site.name)}</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.2;font-weight:500">${esc(title)}</h1>
${body}
<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #e7e0d3;font-size:13px;color:#6b615a">${esc(footer)}</p>
</div></body></html>`;
}

function text(title: string, paragraphs: string[], footer: string) {
  return [title, "", ...paragraphs, "", footer].join("\n");
}

function make(to: string, subject: string, title: string, paragraphs: string[], footer: string, replyTo?: string): Mail {
  return { to, subject, html: layout(title, paragraphs, footer), text: text(title, paragraphs, footer), replyTo };
}

const footer: Record<Lang, string> = {
  da: `${site.name} · Selvstændige specialister i ét hus · ${site.email.contact}`,
  en: `${site.name} · Independent specialists in one house · ${site.email.contact}`,
};

/** To the applicant, right after the application form. */
export function applicationReceived(lang: Lang, to: string, name: string): Mail {
  return lang === "da"
    ? make(
        to,
        "Vi har din ansøgning",
        `Tak, ${name}.`,
        [
          "Vi har modtaget din ansøgning om en plads i huset.",
          "Inden for fem hverdage hører du fra os om næste skridt: en samtale om dit fag med domænet, og derefter en afgørelse. Hele forløbet tager omkring tre uger.",
          `Har du spørgsmål i mellemtiden, så svar på denne mail eller skriv til ${site.email.admission}.`,
        ],
        footer.da,
        site.email.admission,
      )
    : make(
        to,
        "We have your application",
        `Thank you, ${name}.`,
        [
          "We have received your application for a seat in the house.",
          "Within five working days you hear from us about the next step: a conversation about your craft with the domain, then a decision. The whole process takes about three weeks.",
          `Questions in the meantime? Reply to this mail or write to ${site.email.admission}.`,
        ],
        footer.en,
        site.email.admission,
      );
}

/** To the client, right after the contact form. */
export function contactReceived(lang: Lang, to: string, name: string): Mail {
  return lang === "da"
    ? make(
        to,
        "Vi har din besked",
        `Tak, ${name}.`,
        [
          "Vi har modtaget din henvendelse og finder det domæne, der passer til opgaven.",
          "Du hører fra os inden for en hverdag.",
        ],
        footer.da,
        site.email.contact,
      )
    : make(
        to,
        "We have your message",
        `Thank you, ${name}.`,
        [
          "We have received your enquiry and are finding the domain that fits the brief.",
          "You hear from us within one working day.",
        ],
        footer.en,
        site.email.contact,
      );
}

/** To an admitted specialist: welcome, a seat is reserved, sign in and fill your profile. */
export function specialistInvited(lang: Lang, to: string, name: string, domain: string, loginUrl: string): Mail {
  const da = lang === "da";
  const paragraphs = (da
    ? [
        `Du er optaget i TrustUsConsult i domænet ${domain}, og der er reserveret en plads til dig.`,
        `Log ind på ${loginUrl} med denne e-mailadresse; du får et link tilsendt, ingen adgangskode. Under Min side udfylder du din profil, eller importerer den fra dit CV.`,
        "Profilen bliver synlig på sitet, når du udgiver den og bestyrelsen har aktiveret din plads.",
      ]
    : [
        `You have been admitted to TrustUsConsult in the ${domain} domain, and a seat is reserved for you.`,
        `Sign in at ${loginUrl} with this email address; you get a link, no password. Under My page you fill in your profile, or import it from your CV.`,
        "The profile goes live when you publish it and the board has activated your seat.",
      ]);
  return make(
    to,
    da ? "Din plads i huset" : "Your seat in the house",
    da ? `Velkommen, ${name}.` : `Welcome, ${name}.`,
    paragraphs,
    footer[lang],
    site.email.admission,
  );
}

/** To the visitor who asked to read the full CVs. */
export function accessRequestReceived(lang: Lang, to: string, name: string): Mail {
  return lang === "da"
    ? make(
        to,
        "Vi har din anmodning om adgang",
        `Tak, ${name}.`,
        [
          "Vi har modtaget din anmodning om at læse husets fulde CV'er.",
          "Bestyrelsen ser på den inden for en hverdag. Får du adgang, kommer der en mail med et link, og du logger ind uden adgangskode.",
        ],
        footer.da,
        site.email.contact,
      )
    : make(
        to,
        "We have your access request",
        `Thank you, ${name}.`,
        [
          "We have received your request to read the house's full CVs.",
          "The board looks at it within one working day. If you get access, a mail with a link follows, and you sign in without a password.",
        ],
        footer.en,
        site.email.contact,
      );
}

/** To the new client: access granted, here is the door. */
export function accessApproved(lang: Lang, to: string, name: string, loginUrl: string, backTo: string | null): Mail {
  const da = lang === "da";
  return make(
    to,
    da ? "Du har adgang til husets CV'er" : "You have access to the house's CVs",
    da ? `Velkommen, ${name}.` : `Welcome, ${name}.`,
    da
      ? [
          "Bestyrelsen har givet dig adgang til de fulde CV'er, takster og kontaktoplysninger.",
          `Log ind på ${loginUrl} med denne e-mailadresse; du får et link tilsendt, ingen adgangskode.${backTo ? ` Derefter kan du gå direkte til ${backTo}.` : ""}`,
          "Skriv til huset, hvis du vil have hjælp til at finde den rigtige specialist.",
        ]
      : [
          "The board has given you access to the full CVs, rates and contact details.",
          `Sign in at ${loginUrl} with this email address; you get a link, no password.${backTo ? ` Then go straight to ${backTo}.` : ""}`,
          "Write to the house if you want help finding the right specialist.",
        ],
    footer[lang],
    site.email.contact,
  );
}

/** To the visitor: the board did not open the door this time. */
export function accessDeclined(lang: Lang, to: string, name: string): Mail {
  return lang === "da"
    ? make(
        to,
        "Om din anmodning om adgang",
        `Hej ${name}.`,
        [
          "Vi åbner ikke for de fulde CV'er denne gang. Det handler typisk om, at vi ikke kunne se en konkret opgave bag anmodningen.",
          `Har du en opgave, du vil have løst, så skriv til ${site.email.contact} med et par linjer om den, så finder vi domænet og tager det derfra.`,
        ],
        footer.da,
        site.email.contact,
      )
    : make(
        to,
        "About your access request",
        `Hello ${name}.`,
        [
          "We are not opening the full CVs this time. Usually that means we could not see a concrete brief behind the request.",
          `If you have a brief you want solved, write to ${site.email.contact} with a few lines about it and we find the domain from there.`,
        ],
        footer.en,
        site.email.contact,
      );
}

/** To the house: someone asked for access. Danish only; internal. */
export function newAccessRequestNotice(
  to: string,
  r: { name: string; email: string; company: string | null; message: string | null; sourceSlug: string | null; adminUrl: string },
): Mail {
  return make(
    to,
    `Ny anmodning om adgang: ${r.name}${r.company ? ` (${r.company})` : ""}`,
    "Nogen vil læse CV'erne",
    [
      `${r.name} <${r.email}>${r.company ? `, ${r.company}` : ""}${r.sourceSlug ? `, kom fra /specialister/${r.sourceSlug}` : ""}.`,
      r.message ? `Leder efter: ${r.message}` : "Ingen beskrivelse af opgaven.",
      `Godkend eller afslå her: ${r.adminUrl}`,
    ],
    footer.da,
    r.email,
  );
}

/** To the house: a new application landed. Danish only; internal. */
export function newApplicationNotice(
  to: string,
  a: { name: string; email: string; domain: string | null; craft: string | null; years: number | null },
): Mail {
  const where = a.domain ?? a.craft ?? "(ikke angivet)";
  return make(
    to,
    `Ny ansøgning: ${a.name} · ${where}`,
    "Ny ansøgning om en plads",
    [
      `${a.name} <${a.email}> har søgt om en plads.`,
      `Domæne eller fag: ${where}.${a.years !== null ? ` År i faget: ${a.years}.` : ""}`,
      "Ansøgningen ligger i databasen (applications). Adminsiden viser køen fra fase 2.2.",
    ],
    footer.da,
    a.email,
  );
}

/** To the house: a client wrote in. Danish only; internal. */
export function newContactNotice(
  to: string,
  c: { name: string; email: string; company: string | null; domain: string | null; message: string },
): Mail {
  return make(
    to,
    `Ny henvendelse: ${c.name}${c.company ? ` (${c.company})` : ""}`,
    "Ny henvendelse fra en kunde",
    [
      `${c.name} <${c.email}>${c.company ? `, ${c.company}` : ""}${c.domain ? `, om ${c.domain}` : ""} skriver:`,
      c.message,
      "Svar direkte på denne mail; svaret går til afsenderen.",
    ],
    footer.da,
    c.email,
  );
}
