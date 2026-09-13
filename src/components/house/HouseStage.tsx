"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import type { HouseData, HouseDomain } from "@/lib/house";
import { neighboursOf, pad2 } from "@/lib/house";
import type { Lang } from "@/lib/i18n";
import { href, t } from "@/lib/i18n";
import { landing } from "@/content/landing";
import { site } from "@/content/site";
import { RichTitle, fill } from "@/components/ui/RichTitle";
import { track } from "@/components/analytics/TrackView";
import s from "./HouseStage.module.css";

/* The house web component. Created imperatively into a box this component
   owns, so React never reconciles the several thousand SVG nodes. */
type HouseElement = HTMLElement & {
  ready: Promise<unknown>;
  configure(cfg: unknown): void;
  select(id: string): void;
  reset(): void;
  config: { domains: { id: string; name: string }[] };
};

type Level = 0 | 1 | 2;
const VIEW_W = 1086;
const VIEW_H = 1448;

/* One window light, copied out of the artwork so it can fade in its own
   compositing layer instead of repainting the whole facade. */
type Light = { domain: string; x: number; y: number; w: number; h: number; rx: number | null; fill: string };

export function HouseStage({ house, lang }: { house: HouseData; lang: Lang }) {
  const D = house.domains;
  const copy = landing.hero;
  const [level, setLevel] = useState<Level>(0);
  const [i, setI] = useState(0);
  const [scriptReady, setScriptReady] = useState(false);
  /* True once the element exists and its ready promise resolved. Event
     subscriptions depend on this, not on the script load, because the
     element is created a tick later than the script. */
  const [bound, setBound] = useState(false);
  const [lights, setLights] = useState<Light[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  /* The subject carries size and camera transform; the house and the light
     overlay sit inside it and move together. */
  const subjectRef = useRef<HTMLDivElement>(null);
  const houseHostRef = useRef<HTMLDivElement>(null);
  const houseRef = useRef<HouseElement | null>(null);
  const rects = useRef<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const tourHold = useRef<number | null>(null);
  const paused = useRef(false);

  const active: HouseDomain = D[i];
  const related = useMemo(() => neighboursOf(house, active.id).slice(0, 6), [house, active.id]);

  /* ---- house configuration in the current language ---- */
  const pushConfig = useCallback(() => {
    const el = houseRef.current;
    if (!el) return;
    const da = lang === "da";
    try {
      el.configure({
        domains: D.map((d) => ({
          id: d.id,
          name: t(d.name, lang, d.id),
          description: t(d.houseDescription, lang, "") || t(d.blurb, lang, ""),
          skills: t(d.skills, lang, []),
          href: "",
        })),
        relationships: house.relationships,
        copy: da
          ? {
              psst: "Psst…", invitation: "Kig ind.",
              hoverHint: "Hold musen over et vindue.", touchHint: "Tryk på et vindue.",
              kicker: "BAG DETTE VINDUE",
              footer: "Klik på vinduet for at møde specialisten",
              touchFooter: "Vælg et vindue for at møde specialisten",
              houseLabel: "TrustUsConsult som et hus — femten domæner, femten vinduer",
              actionLabel: "Vælg for at møde specialisten.",
            }
          : {
              psst: "Psst…", invitation: "Take a peek.",
              hoverHint: "Hover a window.", touchHint: "Tap a window.",
              kicker: "BEHIND THIS WINDOW",
              footer: "Click the window to meet the specialist",
              touchFooter: "Select a window to find your specialist",
              houseLabel: "TrustUsConsult as a house — fifteen domains, fifteen windows",
              actionLabel: "Select to meet the specialist.",
            },
      });
    } catch {
      /* configuration is validated by the component; nothing to recover */
    }
  }, [D, house.relationships, lang]);

  /* ---- camera: level 0 whole facade, 1 whole facade with a lit window,
          2 zoomed so the window fills ~44% of the stage height ---- */
  const updateCamera = useCallback(() => {
    const subject = subjectRef.current;
    const box = hostRef.current;
    if (!houseRef.current || !subject || !box) return;
    const W = box.clientWidth;
    const H = box.clientHeight;
    if (!W || !H) return;
    const elW = Math.max(160, Math.min(W - 48, (H - 24) * (VIEW_W / VIEW_H)) * 0.86);
    subject.style.width = `${elW}px`;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    subject.style.transition = still ? "none" : "transform 1100ms cubic-bezier(.65,0,.15,1)";
    subject.style.transformOrigin = "0 0";
    if (level < 2) {
      subject.style.transform = "none";
      return;
    }
    const r = rects.current[D[i].id];
    if (!r) return;
    const k0 = elW / VIEW_W;
    const wx = (r.x + r.w / 2) * k0;
    const wy = (r.y + r.h / 2) * k0;
    const wh = r.h * k0;
    const k = Math.min(7, Math.max(2, (H * 0.44) / wh));
    const dx = W * 0.5 - subject.offsetLeft - k * wx;
    const dy = H * 0.5 - subject.offsetTop - k * wy;
    subject.style.transform = `translate(${dx}px,${dy}px) scale(${k})`;
  }, [D, i, level]);

  /* ---- create and bind the element once the script has loaded ---- */
  useEffect(() => {
    if (!scriptReady || houseRef.current || !houseHostRef.current) return;
    const host = houseHostRef.current;
    let cancelled = false;
    (async () => {
      await customElements.whenDefined("trustus-house");
      if (cancelled) return;
      const el = document.createElement("trustus-house") as HouseElement;
      /* No mask here: a mask forces an expensive composited layer on a
         5,600-node drawing. The soft bottom edge is a gradient on the stage. */
      el.style.cssText = "display:block;width:100%;max-width:none";
      const skin: Record<string, string> = {
        "--tuc-card": "var(--hds-fundament)",
        "--tuc-text": "var(--hds-kalk)",
        "--tuc-accent": "var(--hds-murvaerk)",
        "--tuc-heading-font": "var(--hds-font-serif)",
        "--tuc-body-font": "var(--hds-font-body)",
      };
      for (const [k, v] of Object.entries(skin)) el.style.setProperty(k, v);
      host.appendChild(el);
      houseRef.current = el;
      await el.ready;
      if (cancelled) return;
      /* The pane beside the stage carries the copy; hide the component's own card. */
      const style = document.createElement("style");
      /* The pane beside the stage carries the copy, so the component's own
         card is hidden; the lights are hidden too and drawn by the overlay. */
      style.textContent =
        ".layout{grid-template-columns:minmax(0,1fr)!important;gap:0!important}.rail,.card-slot,.card,.invitation{display:none!important}.art{grid-column:1!important;max-width:none!important}.tuc-light{display:none!important}";
      el.shadowRoot?.appendChild(style);
      const found: Light[] = [];
      el.shadowRoot?.querySelectorAll<SVGGElement>(".tuc-window[data-domain]").forEach((g) => {
        const domain = g.dataset.domain!;
        const rc = g.querySelector("rect");
        if (rc)
          rects.current[domain] = {
            x: +rc.getAttribute("x")!,
            y: +rc.getAttribute("y")!,
            w: +rc.getAttribute("width")!,
            h: +rc.getAttribute("height")!,
          };
        g.querySelectorAll<SVGRectElement>("rect.tuc-light").forEach((l) => {
          found.push({
            domain,
            x: +l.getAttribute("x")!,
            y: +l.getAttribute("y")!,
            w: +l.getAttribute("width")!,
            h: +l.getAttribute("height")!,
            rx: l.hasAttribute("rx") ? +l.getAttribute("rx")! : null,
            fill: l.getAttribute("fill") ?? "#edbd60",
          });
        });
      });
      setLights(found);
      pushConfig();
      updateCamera();
      setBound(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [scriptReady, pushConfig, updateCamera]);

  useEffect(() => {
    pushConfig();
  }, [pushConfig]);

  /* ---- events from the house ---- */
  useEffect(() => {
    const el = houseRef.current;
    if (!el) return;
    const idx = (id: string | undefined) => D.findIndex((d) => d.id === id);
    const onPreview = (e: Event) => {
      const id = (e as CustomEvent).detail?.domainId as string | undefined;
      if (!id || level === 2) return;
      const n = idx(id);
      if (n < 0) return;
      holdTour();
      setI(n);
      if (level === 0) setLevel(1);
    };
    const onSelect = (e: Event) => {
      e.preventDefault();
      const detail = (e as CustomEvent).detail;
      if (detail?.source === "api") return;
      const n = idx(detail?.domainId);
      if (n < 0) return;
      holdTour();
      if (level >= 1 && n === i) {
        setLevel(2);
        return;
      }
      setI(n);
      setLevel(1);
    };
    el.addEventListener("trustus:preview", onPreview);
    el.addEventListener("trustus:select", onSelect);
    return () => {
      el.removeEventListener("trustus:preview", onPreview);
      el.removeEventListener("trustus:select", onSelect);
    };
  }, [D, i, level, bound]);

  /* ---- keep the lit window and camera in sync with state ---- */
  useEffect(() => {
    const el = houseRef.current;
    if (!el) return;
    try {
      if (level === 0) el.reset();
      else el.select(D[i].id);
    } catch {
      /* ignore */
    }
    if (level === 1) track("house_window", lang, D[i].id);
    if (level === 2) track("house_inside", lang, D[i].id);
    /* Effects run after commit, so layout is current: update synchronously.
       An animation frame would never fire in a hidden tab. */
    updateCamera();
  }, [D, i, lang, level, updateCamera]);

  useEffect(() => {
    const onResize = () => updateCamera();
    window.addEventListener("resize", onResize);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && level > 0) setLevel((l) => (l - 1) as Level);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
    };
  }, [level, updateCamera]);

  /* ---- the tour: at window level, advance every five seconds unless held ---- */
  function holdTour() {
    paused.current = true;
    if (tourHold.current) window.clearTimeout(tourHold.current);
    tourHold.current = window.setTimeout(() => {
      paused.current = false;
    }, 8000);
  }
  useEffect(() => {
    const id = window.setInterval(() => {
      if (level !== 1 || paused.current) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      setI((n) => (n + 1) % D.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [D.length, level]);

  const jump = (n: number) => {
    holdTour();
    setI(((n % D.length) + D.length) % D.length);
    if (level === 0) setLevel(1);
  };

  const total = active.activeSeats + active.openSeats;
  const c = (v: Parameters<typeof t>[0]) => t(v as never, lang, "") as string;

  /* Which lights are on: the active window at full, its neighbours at a quarter. */
  const relatedIds = useMemo(() => new Set(related.map((m) => m.id)), [related]);
  const lightState = (domain: string) =>
    level === 0 ? "off" : domain === active.id ? "active" : relatedIds.has(domain) ? "near" : "off";

  return (
    <section id="top" className={s.hero} data-level={level}>
      <Script src="/house/trustus-house.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />

      <div
        className={s.stage}
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          if (level > 0) setLevel((l) => (l - 1) as Level);
        }}
      >
        <div ref={hostRef} className={s.host}>
          <div ref={subjectRef} className={s.subject}>
            <div ref={houseHostRef} className={s.houseHost} />
            <svg className={s.lights} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true" focusable="false">
              {lights.map((l, n) => (
                <rect
                  key={`${l.domain}-${n}`}
                  className={s.light}
                  data-state={lightState(l.domain)}
                  x={l.x}
                  y={l.y}
                  width={l.w}
                  height={l.h}
                  rx={l.rx ?? undefined}
                  fill={l.fill}
                />
              ))}
            </svg>
          </div>
        </div>
        <div className={s.stageFade} aria-hidden="true" />
      </div>

      <aside className={s.pane}>
        <div className={s.paneBody}>
          {level === 0 ? (
            <div className={s.block}>
              <span className="hds-eyebrow">{c(copy.eyebrow)}</span>
              <h1 className={s.title}>
                <RichTitle text={c(copy.title)} />
              </h1>
              <p className={s.lede}>{c(copy.lede)}</p>
              <button type="button" className={s.button} onClick={() => setLevel(1)}>
                {c(copy.explore)} <span aria-hidden="true">→</span>
              </button>
              <ol className={s.points}>
                {copy.points.map((p, n) => (
                  <li key={n}>
                    <span>{pad2(n + 1)}</span>
                    <span>{t(p, lang, "")}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {level === 1 ? (
            <div className={s.block}>
              <div className={s.crumbRow}>
                <span className={s.crumb}>
                  <button type="button" onClick={() => setLevel(0)}>{c(copy.house)}</button>
                  <span aria-hidden="true">/</span>
                  <b>{c(copy.window)} {active.sortOrder ? pad2(active.sortOrder) : ""}</b>
                </span>
                <span className={s.arrows}>
                  <button type="button" aria-label={c(copy.prev)} onClick={() => jump(i - 1)}>←</button>
                  <button type="button" aria-label={c(copy.next)} onClick={() => jump(i + 1)}>→</button>
                </span>
              </div>
              <h1 className={s.detailTitle}>{t(active.name, lang, active.id)}</h1>
              {active.tagline ? <p className={`${s.tagline} hds-serif`}>{t(active.tagline, lang, "")}</p> : null}
              <p className={s.desc}>{t(active.blurb, lang, "")}</p>
              <ul className={s.skills}>
                {t(active.skills, lang, []).map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
              <button type="button" className={s.button} onClick={() => setLevel(2)}>
                {c(copy.enter)} <span aria-hidden="true">→</span>
              </button>
              <span className={s.hint}>{c(copy.hoverHint)}</span>
              {related.length ? (
                <div className={s.near}>
                  <span className="hds-eyebrow">{c(copy.lightsWith)}</span>
                  <div className={s.chips}>
                    {related.map((m) => (
                      <button key={m.id} type="button" onClick={() => jump(D.findIndex((d) => d.id === m.id))}>
                        {t(m.name, lang, m.id)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {level === 2 ? (
            <div className={s.block}>
              <div className={s.crumbRow}>
                <span className={s.crumb}>
                  <button type="button" onClick={() => setLevel(0)}>{c(copy.house)}</button>
                  <span aria-hidden="true">/</span>
                  <button type="button" onClick={() => setLevel(1)}>{c(copy.window)} {pad2(active.sortOrder)}</button>
                  <span aria-hidden="true">/</span>
                  <b>{c(copy.inside)}</b>
                </span>
                <span className={s.arrows}>
                  <button type="button" aria-label={c(copy.prev)} onClick={() => jump(i - 1)}>←</button>
                  <button type="button" aria-label={c(copy.next)} onClick={() => jump(i + 1)}>→</button>
                </span>
              </div>
              <span className="hds-eyebrow">
                {t(active.name, lang, active.id)} · {c(copy.yourSpecialist)}
              </span>
              {/* No specialists are admitted yet: the honest state is "the window is open". */}
              <h2 className={s.detailTitle}>{c(copy.recruitingTitle)}</h2>
              <p className={s.desc}>{c(copy.recruitingText)}</p>
              <dl className={s.rows}>
                <dt>{lang === "da" ? "Pladser" : "Seats"}</dt>
                <dd className="hds-tabular">{fill(c(copy.seatsLine), { active: active.activeSeats, total })}</dd>
                <dt>{lang === "da" ? "Status" : "Status"}</dt>
                <dd>{t(site.status[active.status], lang, "")}</dd>
              </dl>
              <div className={s.ctaRow}>
                <a href="#kontakt" className={s.buttonLight}>
                  {c(copy.contactUs)} <span aria-hidden="true">↗</span>
                </a>
                <Link href={href(lang, "/freelancere#ansoeg")} className={s.linkQuiet}>
                  {c(copy.applyHere)} →
                </Link>
              </div>
              <Link href={href(lang, `/domaener/${active.slug}`)} className={s.linkQuiet}>
                {c(copy.openDomainPage)} →
              </Link>
            </div>
          ) : null}
        </div>

        <div className={s.ticks}>
          <div className={s.tickRow}>
            {D.map((d, n) => (
              <button
                key={d.id}
                type="button"
                title={t(d.name, lang, d.id)}
                aria-label={t(d.name, lang, d.id)}
                className={s.tick}
                data-on={n === i && level > 0}
                onClick={() => jump(n)}
              />
            ))}
          </div>
          <span className={s.tickMeta}>
            {level === 0 ? c(copy.tourIdle) : fill(c(copy.tourOf), { n: pad2(active.sortOrder) })}
          </span>
        </div>
      </aside>
    </section>
  );
}
