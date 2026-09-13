import type { ReactNode } from "react";

/**
 * Renders a title string with one italic highlight marked as {em}…{/em}.
 * A lone {em} (no closing tag) means "line break, then italic to the end",
 * which is how the hero title is written.
 */
export function RichTitle({ text, vars }: { text: string; vars?: Record<string, string | number> }) {
  let s = text;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));

  const out: ReactNode[] = [];
  const open = s.indexOf("{em}");
  if (open === -1) return <>{s}</>;
  const close = s.indexOf("{/em}", open);
  out.push(s.slice(0, open));
  if (close === -1) {
    out.push(<br key="br" />);
    out.push(<em key="em" className="hds-serif">{s.slice(open + 4)}</em>);
  } else {
    out.push(<em key="em" className="hds-serif">{s.slice(open + 4, close)}</em>);
    out.push(s.slice(close + 5));
  }
  return <>{out}</>;
}

export function fill(text: string, vars: Record<string, string | number>) {
  let s = text;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
