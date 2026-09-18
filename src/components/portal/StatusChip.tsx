import p from "./portal.module.css";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** One palette for every status word in the portal, so the same state looks the same on every page. */
const TONES: Record<string, Tone> = {
  received: "info", requested: "info", open: "info", published: "info",
  interview: "warning", proposed: "warning", on_hold: "warning", reserved: "warning", notice: "warning", publishedNoSeat: "warning",
  accepted: "success", approved: "success", active: "success", live: "success",
  declined: "neutral", cancelled: "neutral", closed: "neutral", draft: "neutral", handled: "neutral",
};

export function StatusChip({ status, label }: { status: string; label: string }) {
  return (
    <span className={p.chip} data-tone={TONES[status] ?? "neutral"}>
      {label}
    </span>
  );
}
