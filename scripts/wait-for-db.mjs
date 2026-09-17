#!/usr/bin/env node
// Wait for the Supabase preview branch before `next build` on Vercel previews.
//
// The Vercel–Supabase integration creates a Supabase branch per pull request
// and starts the Vercel build at the same moment, before the branch has run
// its migrations. Static generation then fails with "could not find the
// table public.domains". This polls the branch's API (the same URL and key
// the build will use) until the house tables answer, then lets the build go.
//
// Runs only when VERCEL_ENV=preview. Production and local builds skip it.
// No dependencies; plain fetch against PostgREST.

const env = process.env.VERCEL_ENV;
if (env !== "preview") {
  console.log(`wait-for-db: VERCEL_ENV=${env ?? "unset"}, nothing to wait for.`);
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("wait-for-db: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.");
  process.exit(1);
}

const timeoutMs = Number(process.env.WAIT_FOR_DB_TIMEOUT_MS ?? 240_000);
const intervalMs = Number(process.env.WAIT_FOR_DB_INTERVAL_MS ?? 5_000);
const started = Date.now();

// Ready means: the last migration's grants are in place (anon may read) and
// the seed has run (there are domains). Both are what the build needs.
async function ready() {
  try {
    const res = await fetch(`${url}/rest/v1/domains?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.status !== 200) return `HTTP ${res.status}`;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? true : "no domains yet";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

for (;;) {
  const state = await ready();
  const elapsed = Math.round((Date.now() - started) / 1000);
  if (state === true) {
    console.log(`wait-for-db: ${new URL(url).host} is ready after ${elapsed}s.`);
    process.exit(0);
  }
  if (Date.now() - started > timeoutMs) {
    console.error(
      `wait-for-db: ${new URL(url).host} not ready after ${elapsed}s (${state}). ` +
        "The Supabase preview branch has not finished migrating or seeding. Redeploy once it shows ready in the dashboard.",
    );
    process.exit(1);
  }
  console.log(`wait-for-db: ${state}, waiting… (${elapsed}s)`);
  await new Promise((r) => setTimeout(r, intervalMs));
}
