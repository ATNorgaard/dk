"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";

/**
 * What a visitor sees when a page throws. The digest is shown so a report
 * can be matched to the server log (see src/instrumentation.ts).
 */
export default function LangError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams<{ lang?: string }>();
  const da = params?.lang !== "en";
  useEffect(() => {
    console.error("page error", error.digest ?? error.message);
  }, [error]);
  return (
    <main id="main" style={{ maxWidth: 560, margin: "0 auto", padding: "clamp(6rem, 18vh, 10rem) 24px 6rem", display: "grid", gap: 16 }}>
      <span className="hds-eyebrow">{da ? "Noget gik galt" : "Something went wrong"}</span>
      <h1 style={{ fontSize: "var(--hds-text-3xl)", lineHeight: 1.05, letterSpacing: "var(--hds-tracking-display)" }}>
        {da ? "Siden kunne ikke vises." : "The page could not be shown."}
      </h1>
      <p style={{ color: "var(--hds-text-body)" }}>
        {da
          ? "Fejlen er registreret. Prøv igen, og skriv til kontakt@trustusconsult.dk, hvis den bliver ved."
          : "The error has been logged. Try again, and write to kontakt@trustusconsult.dk if it keeps happening."}
      </p>
      <p>
        <button
          type="button"
          onClick={reset}
          style={{ padding: "10px 18px", border: "1px solid var(--hds-fundament)", background: "var(--hds-fundament)", color: "var(--hds-kalk)", font: "inherit", cursor: "pointer" }}
        >
          {da ? "Prøv igen" : "Try again"}
        </button>
      </p>
      {error.digest ? (
        <p style={{ fontFamily: "var(--hds-font-mono)", fontSize: "var(--hds-text-xs)", color: "var(--hds-text-faint)" }}>
          {da ? "Reference" : "Reference"}: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
