import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      style={{
        minHeight: "100svh",
        display: "grid",
        placeContent: "center",
        gap: "var(--hds-space-sm)",
        padding: "var(--hds-gutter)",
        textAlign: "center",
      }}
    >
      <span className="hds-eyebrow">404</span>
      <h1 style={{ fontSize: "var(--hds-text-3xl)", letterSpacing: "var(--hds-tracking-display)" }}>
        Det vindue findes ikke.
        <br />
        <em className="hds-serif" style={{ color: "var(--hds-accent)" }}>That window does not exist.</em>
      </h1>
      <p style={{ color: "var(--hds-text-body)" }}>
        <Link href="/da">Tilbage til huset</Link> · <Link href="/en">Back to the house</Link>
      </p>
    </main>
  );
}
