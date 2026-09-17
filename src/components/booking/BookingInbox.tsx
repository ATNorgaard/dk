import { t, type I18nText, type Lang } from "@/lib/i18n";
import { fmtWhen, hoursBetween, type Booking } from "@/lib/bookings";
import { bookings } from "@/content/bookings";
import { minDatetimeLocal } from "@/lib/dates";
import { acceptTime, declineBooking, proposeTime } from "@/app/actions/bookings";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";
import p from "@/components/portal/portal.module.css";
import b from "./booking.module.css";

/** The specialist's meeting requests on Min side, with accept / propose / decline. */
export function BookingInbox({ lang, path, items }: { lang: Lang; path: string; items: Booking[] }) {
  const c = bookings.minSide;
  const L = (v: I18nText) => t(v, lang, "");
  const open = items.filter((x) => x.status === "requested" || x.status === "proposed");
  const closed = items.filter((x) => !(x.status === "requested" || x.status === "proposed"));
  const minLocal = minDatetimeLocal(2);

  const card = (x: Booking) => {
    const agreed = x.accepted_time_id ? x.times.find((tm) => tm.id === x.accepted_time_id) : null;
    const canAct = x.status === "requested" || x.status === "proposed";
    return (
      <article key={x.id} className={b.card}>
        <div className={a.cardHead}>
          <h3>
            {x.full_name}
            {x.company ? <span className={a.muted}> · {x.company}</span> : null}
          </h3>
          <span className={p.tag}>{t(bookings.status[x.status], lang, x.status)}</span>
        </div>
        <p className={a.meta}>
          <a href={`mailto:${x.email}`}>{x.email}</a> · {x.duration_minutes} min · {fmtWhen(x.created_at, lang)}
          {x.first_reply_at ? ` · ${L(c.replyTime).replace("{hours}", String(hoursBetween(x.created_at, x.first_reply_at)))}` : ""}
        </p>
        <p className={a.pre}>
          <b>{L(c.brief)}:</b> {x.brief}
        </p>
        {agreed ? (
          <p>
            <b>{L(c.agreedAt)}:</b> {fmtWhen(agreed.starts_at, lang)}
          </p>
        ) : (
          <>
            <p className={a.meta}>{L(c.proposedTimes)}</p>
            <ul className={b.times}>
              {x.times.map((tm) => (
                <li key={tm.id} data-by={tm.proposed_by}>
                  <b data-label={tm.proposed_by === "specialist" ? (lang === "da" ? "dit forslag" : "your proposal") : ""}>{fmtWhen(tm.starts_at, lang)}</b>
                  {canAct && tm.proposed_by === "client" ? (
                    <ActionForm action={acceptTime} lang={lang} path={path} submit={L(c.accept)} pending={L({ da: "Sender…", en: "Sending…" })} inline>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="time_id" value={tm.id} />
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
        {canAct ? (
          <div className={b.actions}>
            <ActionForm action={proposeTime} lang={lang} path={path} submit={L(c.proposeSubmit)} pending={L({ da: "Sender…", en: "Sending…" })} inline>
              <input type="hidden" name="id" value={x.id} />
              <label className={a.field}>
                <span>{L(c.proposeOther)}</span>
                <input type="datetime-local" name="starts_at" min={minLocal} required />
              </label>
            </ActionForm>
            <ActionForm action={declineBooking} lang={lang} path={path} submit={L(c.decline)} confirm={`${L(c.decline)}: ${x.full_name}?`} inline>
              <input type="hidden" name="id" value={x.id} />
              <label className={a.field}>
                <span>{L(c.declineNote)}</span>
                <input name="note" />
              </label>
            </ActionForm>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <section className={p.section} id="moeder">
      <h2>{L(c.title)}</h2>
      <p className={a.hint}>{L(c.intro)}</p>
      {items.length === 0 ? <p className={a.hint}>{L(c.none)}</p> : null}
      {open.length ? (
        <>
          <h3>{L(c.open)}</h3>
          {open.map(card)}
        </>
      ) : null}
      {closed.length ? (
        <>
          <h3>{L(c.closed)}</h3>
          {closed.map(card)}
        </>
      ) : null}
    </section>
  );
}
