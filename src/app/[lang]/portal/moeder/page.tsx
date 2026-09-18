import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { loadFullProfile } from "@/lib/specialists";
import { listMyBookings } from "@/lib/bookings";
import { auth } from "@/content/auth";
import { bookings } from "@/content/bookings";
import { PortalShell } from "@/components/portal/PortalShell";
import { PageHeader } from "@/components/portal/PageHeader";
import { BookingInbox } from "@/components/booking/BookingInbox";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Møder", robots: { index: false } };

/** The specialist's meeting requests: accept a time, propose another, decline. */
export default async function MeetingsPage({ params }: PageProps<"/[lang]/portal/moeder">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/portal/moeder");
  const viewer = await requireRole(lang, path, "specialist");
  const full = viewer.person ? await loadFullProfile({ personId: viewer.person.id }) : null;
  const items = full ? await listMyBookings(full.profile.id) : [];
  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.dash}>
        <PageHeader eyebrow={t(auth.portal.sidebar.you, lang, "")} title={t(auth.portal.sidebar.meetings, lang, "")} intro={t(bookings.minSide.intro, lang, "")} />
        {full ? <BookingInbox lang={lang} path={path} items={items} /> : <p className={p.empty}>{t(auth.portal.noRoles, lang, "")}</p>}
      </div>
    </PortalShell>
  );
}
