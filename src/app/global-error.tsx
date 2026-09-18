"use client";

/** Last resort when the language layout itself fails: no fonts, no tokens, plain HTML. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="da">
      <body style={{ margin: 0, padding: "15vh 24px", fontFamily: "system-ui, sans-serif", color: "#1b1b1d", background: "#fff" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 16 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Siden kunne ikke vises. / The page could not be shown.</h1>
          <p>Fejlen er registreret. Prøv igen, eller skriv til kontakt@trustusconsult.dk.</p>
          <p>
            <button type="button" onClick={reset} style={{ padding: "10px 18px", font: "inherit", cursor: "pointer" }}>
              Prøv igen / Try again
            </button>
          </p>
          {error.digest ? <p style={{ fontSize: 12, color: "#6b615a" }}>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
