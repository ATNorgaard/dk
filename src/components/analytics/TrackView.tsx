"use client";

import { useEffect } from "react";
import type { EventType } from "@/lib/events";

/** Sends one view event per page load. Renders nothing. */
export function TrackView({ type, lang, domainId }: { type: EventType; lang: string; domainId?: string }) {
  useEffect(() => {
    track(type, lang, domainId);
  }, [type, lang, domainId]);
  return null;
}

let last = "";
export function track(type: EventType, lang: string, domainId?: string | null) {
  const key = `${type}:${domainId ?? ""}:${location.pathname}`;
  if (key === last) return; // same event twice in a row (hover jitter) is noise
  last = key;
  const body = JSON.stringify({ type, path: location.pathname, lang, domain_id: domainId ?? null });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {
    /* best-effort */
  }
}
