import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t, type I18nText } from "@/lib/i18n";
import { fmtWhen, loadBookingByToken } from "@/lib/bookings";
import { bookings } from "@/content/bookings";
import { site } from "@/content/site";
import { clientAcceptProposal, clientCancel } from "@/app/actions/bookings";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ActionForm } from "@/components/admin/ActionForm";
import { RichTitle } from "@/components/ui/RichTitle";
import p from "@/components/portal/portal.module.css";
import a from "@/components/admin/admin.module.css";
import b from "@/components/booking/booking.module.css";

export const metadata: Metadata = { title: "Møde", robots: { index: false } };

/** The requester's page, reached from their mail with the token. No account needed. */
export default async function BookingPage({ params, searchParams }: PageProps<"/[lang]/booking/[id]">) {
  const { lang, id } = await params;
  if (!isLang(lang)) notFound();
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";
  const booking = await loadBookingByToken(id, token);
  const c = bookings.clientPage;
  const L = (v: I18nText) => t(v, lang, "").replace("{name}", booking?.specialist.name.split(" ")[0] ?? "");
  const nav = [
    { href: href(lang), label: site.nav.forClients },
    { href: href(lang, "/freelancere"), label: site.nav.forFreelancers },
  ];
  const path = `${href(lang, `/booking/${id}`)}?t=${token}`;

  return (
    <>
      <SiteHeader lang={lang} pathname={href(lang, `/booking/${id}`)} items={nav} cta={{ href: `${href(lang)}#kontakt`, label: site.header.bookMeeting }} />
      <main id="main" className={p.page}>
        <div className={p.narrow}>
          <span className="hds-eyebrow">{L(c.eyebrow)}</span>
          {!booking ? (
            <>
              <h1 className={p.title}>404</h1>
              <p className={p.intro}>{L(c.notFound)}</p>
            </>
          ) : (
            <>
              <h1 className={p.title}>
                <RichTitle text={L(c.title).replace("{name}", booking.specialist.name)} />
              </h1>
              <p className={a.meta}>
                <span className={p.tag}>{t(bookings.status[booking.status], lang, booking.status)}</span> · {booking.duration_minutes} min ·{" "}
                <Link href={href(lang, `/specialister/${booking.specialist.slug}`)}>{booking.specialist.name}</Link>
              </p>

              {booking.status === "accepted" ? (
                <p className={p.notice} role="status">
                  <b>{L(c.agreed)}:</b> {fmtWhen(booking.times.find((tm) => tm.id === booking.accepted_time_id)?.starts_at ?? booking.created_at, lang)}. {L(c.acceptedText)}
                </p>
              ) : booking.status === "declined" ? (
                <p className={p.notice} role="status">{L(c.declinedText)}</p>
              ) : booking.status === "cancelled" ? (
                <p className={p.notice} role="status">{L(c.cancelledText)}</p>
              ) : booking.status === "proposed" ? (
                <div className={b.card}>
                  <p>
                    <b>{L(c.theirProposal)}</b>
                  </p>
                  <ul className={b.times}>
                    {booking.times
                      .filter((tm) => tm.proposed_by === "specialist")
                      .map((tm) => (
                        <li key={tm.id}>
                          <b>{fmtWhen(tm.starts_at, lang)}</b>
                          <ActionForm action={clientAcceptProposal} lang={lang} path={path} submit={L(c.acceptProposal)} inline>
                            <input type="hidden" name="id" value={booking.id} />
                            <input type="hidden" name="token" value={token} />
                            <input type="hidden" name="time_id" value={tm.id} />
                          </ActionForm>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className={p.notice} role="status">{L(c.waitingText)}</p>
              )}

              <section className={p.section}>
                <h2>{L(c.yourTimes)}</h2>
                <ul className={b.times}>
                  {booking.times
                    .filter((tm) => tm.proposed_by === "client")
                    .map((tm) => (
                      <li key={tm.id}>
                        <b>{fmtWhen(tm.starts_at, lang)}</b>
                        {booking.accepted_time_id === tm.id ? <span className={p.tag}>{L(c.agreed)}</span> : null}
                      </li>
                    ))}
                </ul>
                <p className={a.pre}>{booking.brief}</p>
              </section>

              {booking.status === "requested" || booking.status === "proposed" ? (
                <ActionForm action={clientCancel} lang={lang} path={path} submit={L(c.cancel)} confirm={`${L(c.cancel)}?`} inline>
                  <input type="hidden" name="id" value={booking.id} />
                  <input type="hidden" name="token" value={token} />
                </ActionForm>
              ) : null}
            </>
          )}
        </div>
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
