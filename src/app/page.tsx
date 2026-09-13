import { createPublicClient } from "@/lib/supabase/public";
import type { I18nList, I18nText } from "@/lib/i18n";
import styles from "./page.module.css";

export const revalidate = 60;

type DomainRow = {
  id: string;
  sort_order: number;
  slug: string;
  name: I18nText;
  tagline: I18nText | null;
  skills: I18nList;
};

type StaffingRow = {
  id: string;
  active_seats: number;
  open_seats: number;
  status: "healthy" | "needs" | "full";
};

async function loadHouse() {
  const supabase = createPublicClient();
  const [domains, staffing] = await Promise.all([
    supabase
      .from("domains")
      .select("id, sort_order, slug, name, tagline, skills")
      .order("sort_order")
      .returns<DomainRow[]>(),
    supabase
      .from("domain_staffing")
      .select("id, active_seats, open_seats, status")
      .returns<StaffingRow[]>(),
  ]);
  if (domains.error) throw domains.error;
  const byId = new Map((staffing.data ?? []).map((s) => [s.id, s]));
  return (domains.data ?? []).map((d) => ({ ...d, staffing: byId.get(d.id) }));
}

export default async function Home() {
  const domains = await loadHouse();
  const recruiting = domains.filter((d) => d.staffing?.status === "needs").length;

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <span className={styles.wordmark}>TrustUsConsult</span>
        <span className={`hds-eyebrow ${styles.phase}`}>Fase 0 · Fundament</span>
      </header>

      <section className={styles.hero}>
        <span className="hds-eyebrow">Find dine folk</span>
        <h1 className={styles.title}>
          Femten fag.
          <br />
          <em className="hds-serif">Én ramme.</em>
        </h1>
        <p className={styles.lede}>
          Huset står nu på sin egen grund: de femten domæner nedenfor læses
          direkte fra databasen. Alle pladser er åbne, indtil de første
          specialister er optaget.
        </p>
      </section>

      <section aria-labelledby="domaener">
        <div className={styles.sectionHead}>
          <h2 id="domaener" className={styles.h2}>
            Domænerne
          </h2>
          <span className={`${styles.count} hds-tabular`}>
            {domains.length} domæner · {recruiting} søger specialister
          </span>
        </div>
        <ol className={styles.grid}>
          {domains.map((d) => (
            <li key={d.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={`${styles.num} hds-tabular`}>
                  {String(d.sort_order).padStart(2, "0")}
                </span>
                <span
                  className={styles.status}
                  data-status={d.staffing?.status ?? "needs"}
                >
                  {d.staffing?.status === "needs" ? "Søger" : d.staffing?.status === "full" ? "Fuldt booket" : "Bemandet"}
                </span>
              </div>
              <h3 className={styles.cardTitle}>{d.name.da}</h3>
              {d.tagline ? (
                <p className={`${styles.tagline} hds-serif`}>{d.tagline.da}</p>
              ) : null}
              <ul className={styles.skills}>
                {d.skills.da.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className={`${styles.seats} hds-tabular`}>
                {d.staffing?.active_seats ?? 0} af{" "}
                {(d.staffing?.active_seats ?? 0) + (d.staffing?.open_seats ?? 0)} pladser besat
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className={styles.footer}>
        TrustUsConsult · Femten domæner · Data fra Supabase (Frankfurt)
      </footer>
    </main>
  );
}
