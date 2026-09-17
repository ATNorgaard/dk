"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import s from "./SiteMotion.module.css";

/**
 * The page's ambient motion, all of it in one place:
 *  - a 3px scroll progress line under the header
 *  - `data-scrolled` on the root once the page has moved, so the header can darken
 *  - reveal-on-scroll for every element carrying `data-reveal`; children with
 *    `--i` stagger. Elements are visible by default; only when this component
 *    has mounted (root gets `data-motion="on"`) are they held back until seen.
 * Respects prefers-reduced-motion: no progress animation, no reveal.
 *
 * The component lives in the layout, so it survives client-side navigation.
 * The reveal pass therefore runs again on every route change and a
 * MutationObserver picks up elements that arrive later (streamed sections,
 * refreshed pages); otherwise a page reached through a link would keep its
 * content at opacity 0 forever, which is exactly what happened on 17
 * September when the domain page was opened from the house.
 */
export function SiteMotion() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
      root.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (reduced) {
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }

    root.dataset.motion = "on";
    const pending = new Set<HTMLElement>();
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) if (e.isIntersecting) show(e.target as HTMLElement);
            },
            { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
          )
        : null;
    const show = (el: HTMLElement) => {
      el.classList.add("is-in");
      pending.delete(el);
      io?.unobserve(el);
    };
    /* Register an element: anything already in view is shown at rest, never
       animated in; the rest wait for the observer or the sweep. */
    const register = (el: HTMLElement) => {
      if (el.classList.contains("is-in") || pending.has(el)) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in");
      else {
        pending.add(el);
        io?.observe(el);
      }
    };
    const scan = (scope: ParentNode = document) => scope.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
    /* Manual pass on scroll: IntersectionObserver is the primary trigger, but it
       does not fire in hidden or throttled documents, and an element must never
       stay invisible because a callback was skipped. */
    const sweep = () => {
      if (!pending.size) return;
      const vh = window.innerHeight;
      for (const el of Array.from(pending)) {
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.94 && r.bottom > 0) show(el);
      }
    };
    scan();
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        rec.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.hasAttribute("data-reveal")) register(node);
          scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", sweep, { passive: true });
    document.addEventListener("visibilitychange", sweep);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", sweep);
      document.removeEventListener("visibilitychange", sweep);
      mo.disconnect();
      io?.disconnect();
      delete root.dataset.motion;
    };
  }, [pathname]);

  return <div ref={bar} className={s.progress} aria-hidden="true" />;
}
