#!/usr/bin/env node
// Admin tool for the seats of each domain in the house.
//
// Run from the repo root so .env.local loads (no dependencies; talks to PostgREST with fetch):
//   node --env-file=.env.local .claude/skills/domain-seats/scripts/seats.mjs <command> [args]
//
// Commands
//   list [domain]                   staffing per domain, plus seat rows when a secret key is set
//   add <domain> [--count N] [--status open|reserved|active|notice|closed] [--note-da ..] [--note-en ..]
//   set <domain> <position> --status <s> [--holder <uuid>] [--paid <iso>] [--notice <iso>]
//                                   [--ends <yyyy-mm-dd>] [--note-da ..] [--note-en ..]
//   remove <domain> <position>      delete one seat row (only when status is open or closed)
//   target <domain> <n>             set domains.target_seats (0..12)
//   override <domain> <healthy|needs|full|none>   set or clear domains.status_override
//
// Reads use the publishable key when no secret key exists (counts only, no rows).
// Writes need SUPABASE_SECRET_KEY. Every command prints the affected domain's
// staffing afterwards so the caller can verify the result.


const EXPECTED_REF = "fghgbjfvdtuhxfmqgzgo";
const DOMAIN_IDS = [
  "mentor", "salg", "bestyrelse", "invest", "consulting", "ai", "hr", "advisory",
  "supply", "disruption", "digital", "projekt", "management", "juridisk", "automation",
];
const SEAT_STATUSES = ["open", "reserved", "active", "notice", "closed"];
const DOMAIN_STATUSES = ["healthy", "needs", "full"];

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else positional.push(a);
  }
  return { positional, flags };
}

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set. Run with --env-file=.env.local from the repo root.");
  if (!url.includes(EXPECTED_REF)) {
    fail(`NEXT_PUBLIC_SUPABASE_URL points at ${url}, not the TUC project (${EXPECTED_REF}). Refusing.`);
  }
  const key = secret || publishable;
  if (!key) fail("Neither SUPABASE_SECRET_KEY nor NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is set.");
  return { url: url.replace(/\/$/, ""), key, canWrite: Boolean(secret) };
}

// Minimal PostgREST call. `query` is an object of column=filter pairs
// (PostgREST syntax, e.g. { id: "eq.ai", order: "position" }).
async function rest(ctx, table, { method = "GET", query = {}, body, prefer } = {}) {
  const qs = new URLSearchParams(query).toString();
  const headers = {
    apikey: ctx.key,
    Authorization: `Bearer ${ctx.key}`,
    "Content-Type": "application/json",
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${ctx.url}/rest/v1/${table}${qs ? `?${qs}` : ""}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { const j = JSON.parse(text); msg = j.message ?? j.hint ?? text; } catch {}
    fail(`${method} ${table}: ${res.status} ${msg}`);
  }
  return text ? JSON.parse(text) : null;
}

function requireDomain(id) {
  if (!id) fail("a domain id is required");
  if (!DOMAIN_IDS.includes(id)) fail(`unknown domain "${id}". Valid ids: ${DOMAIN_IDS.join(", ")}`);
  return id;
}

function requireWrite(ctx) {
  if (!ctx.canWrite) {
    fail("writes need SUPABASE_SECRET_KEY in .env.local (Supabase dashboard > Project settings > API keys > secret). Never commit it.");
  }
}

function note(flags) {
  if (flags["note-da"] === undefined && flags["note-en"] === undefined) return undefined;
  const da = flags["note-da"] ?? flags["note-en"] ?? "";
  const en = flags["note-en"] ?? flags["note-da"] ?? "";
  return { da, en };
}

async function staffing(ctx, domainId) {
  const query = { select: "id,slug,sort_order,name,target_seats,active_seats,open_seats,status", order: "sort_order" };
  if (domainId) query.id = `eq.${domainId}`;
  return rest(ctx, "domain_staffing", { query });
}

async function seatRows(ctx, domainId) {
  if (!ctx.canWrite) return null;
  const query = { select: "id,domain_id,position,status,holder_person_id,buy_in_paid_at,notice_given_at,ends_at,note", order: "domain_id,position" };
  if (domainId) query.domain_id = `eq.${domainId}`;
  return rest(ctx, "seats", { query });
}

function printStaffing(rows) {
  const out = rows.map((r) => ({
    domain: r.id,
    name: r.name?.da ?? r.id,
    target: r.target_seats,
    active: Number(r.active_seats),
    open: Number(r.open_seats),
    status: r.status,
  }));
  console.table(out);
}

function printSeats(rows) {
  if (!rows) {
    console.log("(seat rows hidden: no SUPABASE_SECRET_KEY, showing counts only)");
    return;
  }
  if (rows.length === 0) { console.log("(no seat rows)"); return; }
  console.table(rows.map((s) => ({
    domain: s.domain_id,
    pos: s.position,
    status: s.status,
    holder: s.holder_person_id ?? "",
    paid: s.buy_in_paid_at ?? "",
    notice: s.notice_given_at ?? "",
    ends: s.ends_at ?? "",
    note: s.note?.da ?? "",
  })));
}

async function report(ctx, domainId) {
  printStaffing(await staffing(ctx, domainId));
  printSeats(await seatRows(ctx, domainId));
}

async function cmdList(ctx, { positional }) {
  const domainId = positional[0] ? requireDomain(positional[0]) : undefined;
  await report(ctx, domainId);
}

async function cmdAdd(ctx, { positional, flags }) {
  requireWrite(ctx);
  const domainId = requireDomain(positional[0]);
  const count = Number(flags.count ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 12) fail("--count must be 1..12");
  const status = flags.status ?? "open";
  if (!SEAT_STATUSES.includes(status)) fail(`--status must be one of ${SEAT_STATUSES.join(", ")}`);

  const existing = await seatRows(ctx, domainId);
  const taken = new Set(existing.map((s) => s.position));
  if (taken.size + count > 12) fail(`domain ${domainId} already has ${taken.size} seats; positions are limited to 1..12`);

  const rows = [];
  for (let p = 1; rows.length < count; p++) {
    if (!taken.has(p)) rows.push({ domain_id: domainId, position: p, status, note: note(flags) });
  }
  await rest(ctx, "seats", { method: "POST", body: rows, prefer: "return=minimal" });
  console.log(`added ${rows.length} seat(s) to ${domainId} at position(s) ${rows.map((r) => r.position).join(", ")} with status ${status}`);
  await report(ctx, domainId);
}

async function cmdSet(ctx, { positional, flags }) {
  requireWrite(ctx);
  const domainId = requireDomain(positional[0]);
  const position = Number(positional[1]);
  if (!Number.isInteger(position) || position < 1 || position > 12) fail("position must be 1..12");

  const patch = {};
  if (flags.status !== undefined) {
    if (!SEAT_STATUSES.includes(flags.status)) fail(`--status must be one of ${SEAT_STATUSES.join(", ")}`);
    patch.status = flags.status;
  }
  if (flags.holder !== undefined) patch.holder_person_id = flags.holder === "none" ? null : flags.holder;
  if (flags.paid !== undefined) patch.buy_in_paid_at = flags.paid === "none" ? null : flags.paid;
  if (flags.notice !== undefined) patch.notice_given_at = flags.notice === "none" ? null : flags.notice;
  if (flags.ends !== undefined) patch.ends_at = flags.ends === "none" ? null : flags.ends;
  const n = note(flags);
  if (n !== undefined) patch.note = n;
  if (Object.keys(patch).length === 0) fail("nothing to change: pass --status, --holder, --paid, --notice, --ends or --note-da/--note-en");

  const data = await rest(ctx, "seats", {
    method: "PATCH", body: patch, prefer: "return=representation",
    query: { domain_id: `eq.${domainId}`, position: `eq.${position}`, select: "id" },
  });
  if (!data || data.length === 0) fail(`no seat at ${domainId} position ${position}. Use "add" first or "list ${domainId}" to see positions.`);
  console.log(`updated ${domainId} seat ${position}: ${JSON.stringify(patch)}`);
  await report(ctx, domainId);
}

async function cmdRemove(ctx, { positional }) {
  requireWrite(ctx);
  const domainId = requireDomain(positional[0]);
  const position = Number(positional[1]);
  if (!Number.isInteger(position)) fail("position must be a number");
  const found = await rest(ctx, "seats", {
    query: { select: "status,holder_person_id", domain_id: `eq.${domainId}`, position: `eq.${position}` },
  });
  const current = found[0];
  if (!current) fail(`no seat at ${domainId} position ${position}`);
  if (!["open", "closed"].includes(current.status) || current.holder_person_id) {
    fail(`seat ${domainId}/${position} is ${current.status}${current.holder_person_id ? " with a holder" : ""}. Set it to closed first; rows with people are not deleted here.`);
  }
  await rest(ctx, "seats", {
    method: "DELETE", prefer: "return=minimal",
    query: { domain_id: `eq.${domainId}`, position: `eq.${position}` },
  });
  console.log(`removed ${domainId} seat ${position}`);
  await report(ctx, domainId);
}

async function cmdTarget(ctx, { positional }) {
  requireWrite(ctx);
  const domainId = requireDomain(positional[0]);
  const n = Number(positional[1]);
  if (!Number.isInteger(n) || n < 0 || n > 12) fail("target must be 0..12");
  await rest(ctx, "domains", { method: "PATCH", body: { target_seats: n }, prefer: "return=minimal", query: { id: `eq.${domainId}` } });
  console.log(`set target_seats for ${domainId} to ${n}`);
  await report(ctx, domainId);
}

async function cmdOverride(ctx, { positional }) {
  requireWrite(ctx);
  const domainId = requireDomain(positional[0]);
  const v = positional[1];
  if (v !== "none" && !DOMAIN_STATUSES.includes(v)) fail(`value must be none or one of ${DOMAIN_STATUSES.join(", ")}`);
  await rest(ctx, "domains", {
    method: "PATCH", body: { status_override: v === "none" ? null : v }, prefer: "return=minimal", query: { id: `eq.${domainId}` },
  });
  console.log(v === "none" ? `cleared status_override for ${domainId}` : `set status_override for ${domainId} to ${v}`);
  await report(ctx, domainId);
}

const commands = { list: cmdList, add: cmdAdd, set: cmdSet, remove: cmdRemove, target: cmdTarget, override: cmdOverride };

const [cmd, ...argv] = process.argv.slice(2);
if (!cmd || !commands[cmd]) {
  console.error(`usage: seats.mjs <${Object.keys(commands).join("|")}> ...  (see header comment)`);
  process.exit(cmd ? 1 : 0);
}
await commands[cmd](client(), parseArgs(argv));
