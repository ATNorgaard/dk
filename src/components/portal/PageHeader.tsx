import type { ReactNode } from "react";
import { RichTitle } from "@/components/ui/RichTitle";
import p from "./portal.module.css";

/**
 * The head of every signed-in page: eyebrow, title, one line of intro,
 * status chips under it, and the page's actions on the right (one orange
 * primary at most, the rest quiet). Same shape on portal and admin pages.
 */
export function PageHeader({ eyebrow, title, intro, chips, actions }: { eyebrow?: string; title: string; intro?: string; chips?: ReactNode; actions?: ReactNode }) {
  return (
    <header className={p.pageHeader}>
      <div>
        {eyebrow ? <span className="hds-eyebrow">{eyebrow}</span> : null}
        <h1 className={p.title}>
          <RichTitle text={title} />
        </h1>
        {intro ? <p className={p.intro}>{intro}</p> : null}
        {chips ? <div className={p.chips}>{chips}</div> : null}
      </div>
      {actions ? <div className={p.pageActions}>{actions}</div> : null}
    </header>
  );
}
