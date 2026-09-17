import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { href, isLang, t } from "@/lib/i18n";
import { requireRole } from "@/lib/auth";
import { listDomainsForAdmin, listSeats, SEAT_STATUSES } from "@/lib/admin";
import { admin } from "@/content/admin";
import { addSeats, removeSeat, updateSeat } from "@/app/actions/admin";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { ActionForm } from "@/components/admin/ActionForm";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Pladser · Admin", robots: { index: false } };

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export default async function SeatsPage({ params, searchParams }: PageProps<"/[lang]/admin/pladser">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const base = href(lang, "/admin/pladser");
  const viewer = await requireRole(lang, base, "board", "admin");
  const sp = await searchParams;
  const [domains, seats] = await Promise.all([listDomainsForAdmin(), listSeats()]);
  const current = domains.find((d) => d.id === sp.d) ?? domains[0];
  const path = current ? `${base}?d=${current.id}` : base;
  const c = admin.seats;
  const L = (v: { da: string; en: string }) => t(v, lang, "");

  return (
    <AdminFrame lang={lang} path={base} viewer={viewer} title={c.title} intro={c.intro}>
      <div className={a.filters}>
        {domains.map((d) => {
          const active = seats.filter((s) => s.domain_id === d.id && s.status === "active").length;
          return (
            <Link key={d.id} href={`${base}?d=${d.id}`} aria-current={current?.id === d.id ? "true" : undefined}>
              {t(d.name, lang, d.id)} <span className={a.muted}>{active}/{d.target_seats}</span>
            </Link>
          );
        })}
      </div>
      {domains.filter((d) => d.id === current?.id).map((d) => {
        const rows = seats.filter((s) => s.domain_id === d.id);
        const active = rows.filter((s) => s.status === "active").length;
        const open = rows.filter((s) => s.status === "open").length;
        return (
          <section key={d.id} className={a.seatDomain} id={d.id}>
            <h3>
              {t(d.name, lang, d.id)}{" "}
              <span className={a.muted}>
                · {L(c.summary).replace("{active}", String(active)).replace("{target}", String(d.target_seats)).replace("{open}", String(open))}
                {" · "}
                <Link href={href(lang, `/admin/domaener/${d.id}`)}>{L(admin.domains.fields.targetSeats)} →</Link>
              </span>
            </h3>
            <div className={a.seatRows}>
              {rows.map((s) => (
                <div key={s.id} className={a.seatRow} data-status={s.status}>
                  <b>{String(s.position).padStart(2, "0")}</b>
                  <ActionForm action={updateSeat} lang={lang} path={path} submit={L(admin.common.save)} pending={L(admin.common.saving)} inline>
                    <input type="hidden" name="id" value={s.id} />
                    <label className={a.field}>
                      <span>{L(admin.common.status)}</span>
                      <select name="status" defaultValue={s.status}>
                        {SEAT_STATUSES.map((st) => (
                          <option key={st} value={st}>{t(c.status[st], lang, st)}</option>
                        ))}
                      </select>
                    </label>
                    <label className={a.field}>
                      <span>{L(c.holder)}</span>
                      <input name="holder_email" type="email" defaultValue={s.holder?.email ?? ""} placeholder="–" />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.paid)}</span>
                      <input name="buy_in_paid_at" type="date" defaultValue={day(s.buy_in_paid_at)} />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.noticeGiven)}</span>
                      <input name="notice_given_at" type="date" defaultValue={day(s.notice_given_at)} />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.endsAt)}</span>
                      <input name="ends_at" type="date" defaultValue={s.ends_at ?? ""} />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.note)} · DA</span>
                      <input name="note_da" defaultValue={s.note?.da ?? ""} />
                    </label>
                    <label className={a.field}>
                      <span>{L(c.note)} · EN</span>
                      <input name="note_en" defaultValue={s.note?.en ?? ""} />
                    </label>
                  </ActionForm>
                  {(s.status === "open" || s.status === "closed") && !s.holder_person_id ? (
                    <ActionForm action={removeSeat} lang={lang} path={path} submit={L(c.remove)} confirm={`${L(c.remove)} ${t(d.name, lang, d.id)} ${String(s.position).padStart(2, "0")}?`} inline>
                      <input type="hidden" name="id" value={s.id} />
                    </ActionForm>
                  ) : null}
                </div>
              ))}
            </div>
            {rows.length < 12 ? (
              <ActionForm action={addSeats} lang={lang} path={path} submit={L(c.add)} pending={L(admin.common.saving)} inline>
                <input type="hidden" name="domain_id" value={d.id} />
                <label className={a.field}>
                  <span>{L(c.count)}</span>
                  <input name="count" type="number" min={1} max={12 - rows.length} defaultValue={1} className={a.narrow} />
                </label>
                <label className={a.field}>
                  <span>{L(admin.common.status)}</span>
                  <select name="status" defaultValue="open">
                    {SEAT_STATUSES.map((st) => (
                      <option key={st} value={st}>{t(c.status[st], lang, st)}</option>
                    ))}
                  </select>
                </label>
              </ActionForm>
            ) : null}
          </section>
        );
      })}
      <p className={a.hint}>{L(c.removeHint)}</p>
    </AdminFrame>
  );
}
