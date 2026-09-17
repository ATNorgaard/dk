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

/**
 * Builds the light overlay: a copy of every window group (glass, clipped
 * panes with the light, frame, focus ring) plus the clip paths they reference,
 * in a separate SVG that lives in its own compositing layer. The facade
 * underneath never repaints when a light fades. Hit areas and titles are left
 * out; pointer events stay with the real windows in the shadow root.
 */
function buildOverlay(el: HouseElement, overlay: SVGSVGElement, lamps: HTMLDivElement) {
  const root = el.shadowRoot;
  if (!root) return;
  const ns = "http://www.w3.org/2000/svg";
  const defs = document.createElementNS(ns, "defs");
  const seen = new Set<string>();
  const wins = document.createElementNS(ns, "g");
  const lampEls: SVGSVGElement[] = [];

  root.querySelectorAll<SVGGElement>(".tuc-window[data-domain]").forEach((g) => {
    const domain = g.dataset.domain!;
    const clone = g.cloneNode(true) as SVGGElement;
    clone.querySelectorAll(".tuc-hit, title").forEach((n) => n.remove());
    for (const a of ["tabindex", "role", "aria-label", "aria-pressed", "aria-describedby"]) clone.removeAttribute(a);
    clone.classList.remove("is-active", "is-neighbour");

    /* The light leaves the static clone and becomes its own element, so
       fading it is a compositor-only change: nothing is repainted. */
    const light = clone.querySelector<SVGRectElement>("rect.tuc-light");
    if (light) {
      const clipped = light.closest<SVGElement>("[clip-path]");
      const clipId = clipped?.getAttribute("clip-path")?.match(/#([^)]+)/)?.[1];
      const def = clipId ? root.getElementById(clipId) : null;
      const x = +light.getAttribute("x")!, y = +light.getAttribute("y")!;
      const w = +light.getAttribute("width")!, h = +light.getAttribute("height")!;
      const lamp = document.createElementNS(ns, "svg");
      lamp.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
      lamp.setAttribute("aria-hidden", "true");
      lamp.dataset.domain = domain;
      lamp.dataset.state = "off";
      lamp.style.cssText = `left:${(x / VIEW_W) * 100}%;top:${(y / VIEW_H) * 100}%;width:${(w / VIEW_W) * 100}%;height:${(h / VIEW_H) * 100}%`;
      const rect = light.cloneNode(true) as SVGRectElement;
      if (def && clipId) {
        const d = document.createElementNS(ns, "defs");
        const c = def.cloneNode(true) as SVGElement;
        c.id = `${clipId}-lamp`;
        d.appendChild(c);
        lamp.appendChild(d);
        rect.setAttribute("clip-path", `url(#${clipId}-lamp)`);
      }
      lamp.appendChild(rect);
      lampEls.push(lamp);
      light.remove();
    }

    for (const m of clone.outerHTML.matchAll(/url\(#([^)]+)\)/g)) {
      const id = m[1];
      if (seen.has(id)) continue;
      const def = root.getElementById(id);
      if (def) {
        defs.appendChild(def.cloneNode(true));
        seen.add(id);
      }
    }
    wins.appendChild(clone);
  });
  overlay.replaceChildren(defs, wins);
  lamps.replaceChildren(...lampEls);
}

/** What level two shows for a domain that has a live specialist. Serializable: comes from the server page. */
export type WindowTeaser = {
  slug: string;
  name: string;
  title: string | null;
  tagline: string | null;
  city: string | null;
  years: number | null;
  more: number;
};

export function HouseStage({ house, lang, teasers = {} }: { house: HouseData; lang: Lang; teasers?: Record<string, WindowTeaser> }) {
  const D = house.domains;
  const copy = landing.hero;
  const [level, setLevel] = useState<Level>(0);
  const [i, setI] = useState(0);
  const [scriptReady, setScriptReady] = useState(false);
  /* True once the element exists and its ready promise resolved. Event
     subscriptions depend on this, not on the script load, because the
     element is created a tick later than the script. */
  const [bound, setBound] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const lampsRef = useRef<HTMLDivElement>(null);
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
         5,600-node drawing. The soft foot is a gradient inside the subject. */
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
         card is hidden. The domain windows' visuals are hidden too (kept for
         hit testing and focus) and drawn by the overlay instead. The five
         decorative windows have no domain and no overlay clone, so they must
         stay visible in the drawing. */
      style.textContent =
        ".layout{grid-template-columns:minmax(0,1fr)!important;gap:0!important}.rail,.card-slot,.card,.invitation{display:none!important}.art{grid-column:1!important;max-width:none!important}.tuc-window[data-domain]>:not(.tuc-hit){opacity:0!important}";
      el.shadowRoot?.appendChild(style);
      el.shadowRoot?.querySelectorAll<SVGGElement>(".tuc-window[data-domain]").forEach((g) => {
        const rc = g.querySelector("rect");
        if (rc)
          rects.current[g.dataset.domain!] = {
            x: +rc.getAttribute("x")!,
            y: +rc.getAttribute("y")!,
            w: +rc.getAttribute("width")!,
            h: +rc.getAttribute("height")!,
          };
      });
      if (overlayRef.current && lampsRef.current) buildOverlay(el, overlayRef.current, lampsRef.current);
      /* Mirror keyboard focus onto the overlay's focus ring. */
      const syncFocus = () => {
        const focused = (el.shadowRoot?.activeElement as HTMLElement | null)?.closest?.(".tuc-window") as
          | HTMLElement
          | null
          | undefined;
        overlayRef.current?.querySelectorAll<SVGGElement>(".tuc-window").forEach((w) => {
          w.dataset.focus = String(!!focused && focused.dataset.domain === w.dataset.domain);
        });
      };
      el.addEventListener("focusin", syncFocus);
      el.addEventListener("focusout", () => setTimeout(syncFocus, 0));
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

  /* Which lights are on: the active window at full, its neighbours at a quarter.
     Applied as the artwork's own classes on the overlay clones. */
  const relatedIds = useMemo(() => new Set(related.map((m) => m.id)), [related]);
  useEffect(() => {
    lampsRef.current?.querySelectorAll<SVGSVGElement>("svg[data-domain]").forEach((lamp) => {
      const id = lamp.dataset.domain ?? "";
      lamp.dataset.state =
        level === 0 ? "off" : id === active.id ? "active" : relatedIds.has(id) ? "near" : "off";
    });
  }, [active.id, level, relatedIds, bound]);

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
            <svg ref={overlayRef} className={s.windows} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true" focusable="false" />
            <div ref={lampsRef} className={s.lamps} aria-hidden="true" />
            <div className={s.houseFade} aria-hidden="true" />
          </div>
        </div>
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
              {teasers[active.id] ? (
                <>
                  <h2 className={s.detailTitle}>{teasers[active.id].name}</h2>
                  {teasers[active.id].title ? <p className={s.desc}><b>{teasers[active.id].title}</b></p> : null}
                  {teasers[active.id].tagline ? <p className={s.desc}>{teasers[active.id].tagline}</p> : null}
                  <dl className={s.rows}>
                    {teasers[active.id].city ? (<><dt>{lang === "da" ? "By" : "City"}</dt><dd>{teasers[active.id].city}</dd></>) : null}
                    {teasers[active.id].years !== null ? (<><dt>{lang === "da" ? "Erfaring" : "Experience"}</dt><dd className="hds-tabular">{teasers[active.id].years} {lang === "da" ? "år" : "years"}</dd></>) : null}
                    <dt>{lang === "da" ? "Pladser" : "Seats"}</dt>
                    <dd className="hds-tabular">{fill(c(copy.seatsLine), { active: active.activeSeats, total })}</dd>
                  </dl>
                  <div className={s.ctaRow}>
                    <Link href={href(lang, `/specialister/${teasers[active.id].slug}`)} className={s.buttonLight}>
                      {lang === "da" ? `Mød ${teasers[active.id].name.split(" ")[0]}` : `Meet ${teasers[active.id].name.split(" ")[0]}`} <span aria-hidden="true">→</span>
                    </Link>
                    {teasers[active.id].more > 0 ? (
                      <Link href={href(lang, `/domaener/${active.slug}#specialister`)} className={s.linkQuiet}>
                        {lang === "da" ? `+ ${teasers[active.id].more} til i domænet` : `+ ${teasers[active.id].more} more in the domain`} →
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  {/* No live specialist in this window: the honest state is "the window is open". */}
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
                </>
              )}
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
