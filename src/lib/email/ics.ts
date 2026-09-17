/**
 * A minimal iCalendar file for a first meeting. One VEVENT, UTC times,
 * both parties as attendees. Enough for Outlook, Google and Apple to
 * offer "add to calendar".
 */
export function buildIcs(ev: {
  uid: string;
  startsAt: Date;
  minutes: number;
  summary: string;
  description: string;
  organiser: { name: string; email: string };
  attendee: { name: string; email: string };
}) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const end = new Date(ev.startsAt.getTime() + ev.minutes * 60_000);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrustUsConsult//Huset//DA",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@trustusconsult.dk`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(ev.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(ev.summary)}`,
    `DESCRIPTION:${esc(ev.description)}`,
    `ORGANIZER;CN=${esc(ev.organiser.name)}:mailto:${ev.organiser.email}`,
    `ATTENDEE;CN=${esc(ev.attendee.name)};RSVP=FALSE:mailto:${ev.attendee.email}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // Fold lines longer than 75 octets, as the spec asks.
  return lines.map((l) => (l.length <= 75 ? l : l.match(/.{1,74}/g)!.join("\r\n "))).join("\r\n") + "\r\n";
}
