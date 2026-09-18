import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { href, isLang, t } from "@/lib/i18n";
import { hasRole, requireViewer } from "@/lib/auth";
import { loadHouse } from "@/lib/house";
import { age, boardDashboard, specialistDashboard } from "@/lib/portal";
import { fmtWhen } from "@/lib/bookings";
import { auth } from "@/content/auth";
import { specialists } from "@/content/specialists";
import { admin } from "@/content/admin";
import { PortalShell } from "@/components/portal/PortalShell";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatusChip } from "@/components/portal/StatusChip";
import p from "@/components/portal/portal.module.css";

export const metadata: Metadata = { title: "Overblik", robots: { index: false } };

/**
 * The signed-in front page. A specialist sees their profile's state and
 * what is missing, the requests waiting for them and the next meeting. The
 * board sees the queues with count and age, the people behind them, the
 * response-time figure, the seats and the latest activity. Someone with
 * both roles sees both.
 */
export default async function PortalPage({ params, searchParams }: PageProps<"/[lang]/portal">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const path = href(lang, "/portal");
  const viewer = await requireViewer(lang, path);
  const sp = await searchParams;
  const c = auth.portal;
  const d = c.dashboard;
  const L = (v: { da: string; en: string }) => t(v, lang, "");
  const name = viewer.person?.displayName?.split(" ")[0] ?? viewer.email ?? "";
  const [spec, board, house] = await Promise.all([
    hasRole(viewer, "specialist") ? specialistDashboard(viewer) : null,
    hasRole(viewer, "board", "admin") ? boardDashboard(lang) : null,
    loadHouse(),
  ]);
  const domainName = (id: string | null) => {
    const dom = id ? house.domains.find((x) => x.id === id) : null;
    return dom ? t(dom.name, lang, dom.id) : (id ?? "");
  };
  const primary = spec ? (
    <Link href={href(lang, "/portal/min-side")} className={p.primary}>
      {L(d.editProfile)}
    </Link>
  ) : board ? (
    <Link href={href(lang, "/admin/ansoegninger")} className={p.primary}>
      {L(d.openQueue)}
    </Link>
  ) : null;

  return (
    <PortalShell lang={lang} pathname={path} viewer={viewer}>
      <div className={p.dash}>
        {sp.denied ? <p className={p.notice} role="status">{L(c.denied)}</p> : null}
        <PageHeader
          eyebrow={L(d.eyebrow)}
          title={L(c.hello).replace("{name}", name)}
          chips={viewer.memberships.map((m) => (
            <span key={m.id} className={p.tag} data-heart={m.role === "board" || m.role === "admin"}>
              {t(auth.roles[m.role], lang, m.role)}
              {m.domain_id ? ` · ${domainName(m.domain_id)}` : ""}
            </span>
          ))}
          actions={primary}
        />
        {!viewer.memberships.length ? <p className={p.empty}>{L(c.noRoles)}</p> : null}

        {spec ? (
          <section className={p.twoCol} aria-label={L(d.profileTitle)}>
            <div className={p.block}>
              <h2>{L(d.profileTitle)}</h2>
              <div className={p.chips}>
                <StatusChip status={spec.statusKey} label={L(d.statusShort[spec.statusKey])} />
                <span className={p.chip} data-tone="neutral">{L(specialists.minSide.completeness).replace("{pct}", String(spec.pct))}</span>
              </div>
              <p>{L(specialists.minSide.status[spec.statusKey])}</p>
              {spec.checklist.some((x) => !x.done) ? (
                <>
                  <h3 className={p.cardLabel}>{L(d.checklistTitle)}</h3>
                  <ul className={p.check}>
                    {spec.checklist.map((x) => (
                      <li key={x.key} data-done={x.done}>
                        {x.done ? L(d.checklist[x.key]) : <Link href={href(lang, "/portal/min-side")}>{L(d.checklist[x.key])}</Link>}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>{L(d.complete)}</p>
              )}
              <div className={p.pageActions}>
                <Link href={href(lang, "/portal/min-side")} className={p.quiet}>{L(d.importLinkedIn)}</Link>
                {spec.live ? <Link href={href(lang, `/specialister/${spec.full.profile.slug}`)} className={p.quiet}>{L(specialists.minSide.viewPublic)} ↗</Link> : null}
              </div>
            </div>
            <div className={p.block}>
              <h2>{L(d.requestsTitle)}</h2>
              {spec.needsReply.length ? (
                <ul className={p.rows}>
                  {spec.needsReply.map((b) => (
                    <li key={b.id}>
                      <Link href={href(lang, "/portal/moeder")}>{b.full_name}</Link>
                      <span className={p.muted}>{b.company ?? ""}</span>
                      <span className={p.age}>{L(d.waiting).replace("{age}", age(b.created_at, lang))}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={p.empty}>{L(d.noRequests)}</p>
              )}
              {spec.awaitingClient.length ? <p>{L(d.awaitingClient).replace("{n}", String(spec.awaitingClient.length))}</p> : null}
              <h3 className={p.cardLabel}>{L(d.nextMeeting)}</h3>
              {spec.nextMeeting ? (
                <p>
                  <b>{fmtWhen(spec.nextMeeting.startsAt, lang)}</b> · {spec.nextMeeting.booking.full_name}
                  {spec.nextMeeting.booking.company ? ` (${spec.nextMeeting.booking.company})` : ""} · {spec.nextMeeting.booking.duration_minutes} min
                </p>
              ) : (
                <p className={p.muted}>{L(d.noMeeting)}</p>
              )}
              <div className={p.pageActions}>
                <Link href={href(lang, "/portal/moeder")} className={p.quiet}>{L(d.allRequests)}</Link>
              </div>
            </div>
          </section>
        ) : null}

        {board ? (
          <>
            <section className={p.block} aria-label={L(d.queuesTitle)}>
              <h2>{L(d.queuesTitle)}</h2>
              <div className={p.cards}>
                {(
                  [
                    { key: "applications", label: admin.nav.applications, to: "/admin/ansoegninger", q: board.queues.applications },
                    { key: "access", label: admin.nav.access, to: "/admin/adgang", q: board.queues.access },
                    { key: "contacts", label: admin.nav.contacts, to: "/admin/henvendelser", q: board.queues.contacts },
                    { key: "bookings", label: admin.nav.bookings, to: "/admin/bookinger", q: board.queues.bookings },
                  ] as const
                ).map((x) => (
                  <Link key={x.key} href={href(lang, x.to)} className={p.card}>
                    <span className={p.cardNum}>{x.q.n}</span>
                    <span className={p.cardLabel}>{L(x.label)}</span>
                    <span className={p.cardMeta}>{x.q.oldest ? L(d.oldest).replace("{age}", age(x.q.oldest, lang)) : L(d.nothingWaiting)}</span>
                  </Link>
                ))}
              </div>
            </section>
            <section className={p.twoCol}>
              <div className={p.block}>
                <h2>{L(d.peopleTitle)}</h2>
                {board.waiting.length ? (
                  <ul className={p.rows}>
                    {board.waiting.map((w, i) => (
                      <li key={i}>
                        <StatusChip status="received" label={L(d.kinds[w.kind])} />
                        <Link href={w.href}>{w.name}</Link>
                        <span className={p.muted}>{w.kind === "application" ? domainName(w.detail) : w.detail}</span>
                        <span className={p.age}>{age(w.since, lang)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={p.empty}>{L(d.nothingWaiting)}</p>
                )}
                <h2>{L(d.activityTitle)}</h2>
                {board.activity.length ? (
                  <ul className={p.rows}>
                    {board.activity.map((a, i) => (
                      <li key={i}>
                        <span>{a.actor || L(d.system)}</span>
                        <span className={p.muted}>{L(d.actions[a.action])} · {a.table}</span>
                        <span className={p.age}>{age(a.at, lang)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={p.empty}>{L(d.noActivity)}</p>
                )}
              </div>
              <div className={p.block}>
                <h2>{L(d.kpiTitle)}</h2>
                <div className={p.kpi}>
                  <div>
                    <b>{board.kpi.medianHours === null ? "–" : `${board.kpi.medianHours} ${lang === "da" ? "t" : "h"}`}</b>
                    <span>{L(d.kpiMedian)}</span>
                  </div>
                  <div>
                    <b>{board.kpi.replied}</b>
                    <span>{L(d.kpiReplied)}</span>
                  </div>
                  <div>
                    <b>{board.kpi.over24h}</b>
                    <span>{L(d.kpiOver)}</span>
                  </div>
                </div>
                <h2>{L(d.seatsTitle)}</h2>
                <div className={p.seatMap}>
                  {house.domains.map((dom) => (
                    <Link key={dom.id} href={href(lang, `/admin/pladser?d=${dom.id}`)} className={p.seatRowMap}>
                      <b>{String(dom.sortOrder).padStart(2, "0")}</b>
                      <span>{t(dom.name, lang, dom.id)}</span>
                      {(board.seats[dom.id] ?? []).map((s) => (
                        <i key={s.id} className={p.seat} data-status={s.status} title={`${s.position} · ${s.status}${s.holder ? ` · ${s.holder.display_name}` : ""}`} />
                      ))}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {!spec && !board ? (
          <section className={p.block}>
            <h2>{L(c.doorsTitle)}</h2>
            <ul className={p.tiles}>
              <li>
                <Link href={href(lang)} className={p.tileLink}>
                  <span>{L(c.doors.site)}</span>
                  <small>{L(c.doors.siteText)}</small>
                </Link>
              </li>
            </ul>
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}
