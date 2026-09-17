import { site } from "@/content/site";

/**
 * Transactional email behind one function, so the provider can change
 * without touching the callers. The provider is picked from the
 * environment: Resend when RESEND_API_KEY is set, otherwise a logger that
 * prints the mail and sends nothing (local development, previews without
 * the key). Sending is best effort: callers never fail a form because a
 * mail did not go out.
 */
export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendResult = { ok: true; id: string | null; provider: string } | { ok: false; provider: string; error: string };

export interface EmailProvider {
  readonly name: string;
  send(mail: Mail, from: string): Promise<SendResult>;
}

/** The From header. Set EMAIL_FROM once the sending domain is verified. */
export function fromAddress() {
  return process.env.EMAIL_FROM ?? `${site.name} <onboarding@resend.dev>`;
}

/** Where the house is notified about new applications and enquiries. */
export const notify = {
  applications: process.env.EMAIL_NOTIFY_APPLICATIONS ?? site.email.admission,
  contact: process.env.EMAIL_NOTIFY_CONTACT ?? site.email.contact,
};

function pickProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return resend(process.env.RESEND_API_KEY);
  return logger;
}

export async function sendEmail(mail: Mail): Promise<SendResult> {
  const provider = pickProvider();
  try {
    return await provider.send(mail, fromAddress());
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`email via ${provider.name} failed:`, error);
    return { ok: false, provider: provider.name, error };
  }
}

/* Providers */

function resend(apiKey: string): EmailProvider {
  return {
    name: "resend",
    async send(mail, from) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: Array.isArray(mail.to) ? mail.to : [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          reply_to: mail.replyTo,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
      if (!res.ok) {
        const error = body.message ?? body.name ?? `HTTP ${res.status}`;
        console.error("resend rejected the mail:", error);
        return { ok: false, provider: "resend", error };
      }
      return { ok: true, id: body.id ?? null, provider: "resend" };
    },
  };
}

const logger: EmailProvider = {
  name: "log",
  async send(mail, from) {
    console.info(`[email not sent: no RESEND_API_KEY] from ${from} to ${mail.to} · ${mail.subject}\n${mail.text}`);
    return { ok: false, provider: "log", error: "no provider configured" };
  },
};
