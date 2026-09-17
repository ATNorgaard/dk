#!/usr/bin/env node
// Admin tool for people and their roles in the house. Stopgap until the
// admin page (roadmap 2.2) lets the board do this under their own roles.
//
// Run from the repo root so .env.local loads (no dependencies; talks to
// PostgREST and the Auth admin API with fetch):
//   pnpm roles <command> [args]
//   node --env-file=.env.local scripts/roles.mjs <command> [args]
//
// Commands
//   list                                   everyone with their roles
//   grant <email> <role> [--domain <id>] [--name "Display name"] [--lang da|en]
//                                          create the person and auth account if missing, add the role
//   revoke <email> <role> [--domain <id>]  set that membership to revoked
//
// Roles: client, specialist, domain_lead, board, admin. specialist and
// domain_lead need --domain. Needs SUPABASE_SECRET_KEY in .env.local: it is the
// service role and bypasses row-level security, so only admins get one.
// Creating the auth account sends no email; the person signs in with a magic
// link from /log-ind when they are ready.

const EXPECTED_REF = "fghgbjfvdtuhxfmqgzgo";
const ROLES = ["client", "specialist", "domain_lead", "board", "admin"];
const DOMAIN_ROLES = ["specialist", "domain_lead"];
const DOMAIN_IDS = [
  "mentor", "salg", "bestyrelse", "invest", "consulting", "ai", "hr", "advisory",
  "supply", "disruption", "digital", "projekt", "management", "juridisk", "automation",
];

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
  if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set. Run with --env-file=.env.local from the repo root.");
  if (!url.includes(EXPECTED_REF)) fail(`NEXT_PUBLIC_SUPABASE_URL points at ${url}, not the TUC project (${EXPECTED_REF}). Refusing.`);
  if (!secret) fail("SUPABASE_SECRET_KEY is not set. People and roles are private; this script needs the service role.");
  return { url: url.replace(/\/$/, ""), key: secret };
}

async function call(ctx, path, { method = "GET", query = {}, body, prefer } = {}) {
  const qs = new URLSearchParams(query).toString();
  const headers = { apikey: ctx.key, Authorization: `Bearer ${ctx.key}`, "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${ctx.url}${path}${qs ? `?${qs}` : ""}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { ok: res.ok, status: res.status, json, text };
}

async function rest(ctx, table, opts) {
  const r = await call(ctx, `/rest/v1/${table}`, opts);
  if (!r.ok) fail(`${opts?.method ?? "GET"} ${table}: ${r.json?.message ?? r.json?.hint ?? r.text}`);
  return r.json;
}

function requireEmail(v) {
  const email = (v ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(`"${v}" is not an email address.`);
  return email;
}

function requireRole(v) {
  if (!ROLES.includes(v)) fail(`role must be one of ${ROLES.join(", ")}.`);
  return v;
}

function requireDomainFor(role, flags) {
  const domain = flags.domain;
  if (DOMAIN_ROLES.includes(role)) {
    if (!domain || !DOMAIN_IDS.includes(domain)) fail(`${role} needs --domain <${DOMAIN_IDS.join("|")}>.`);
    return domain;
  }
  if (domain) fail(`${role} does not take a domain.`);
  return null;
}

async function people(ctx, email) {
  return rest(ctx, "people", {
    query: {
      select: "id,email,display_name,lang,user_id,memberships!person_id(id,role,domain_id,status)",
      order: "display_name",
      ...(email ? { email: `eq.${email}` } : {}),
    },
  });
}

function printPeople(rows) {
  if (!rows.length) { console.log("(no people)"); return; }
  for (const p of rows) {
    const roles = (p.memberships ?? [])
      .filter((m) => m.status === "active")
      .map((m) => (m.domain_id ? `${m.role}:${m.domain_id}` : m.role));
    const account = p.user_id ? "account linked" : "no account yet";
    console.log(`${p.display_name} <${p.email}>  [${p.lang}]  ${roles.join(", ") || "-"}  (${account})`);
  }
}

/** Find or create the auth user for an email. Returns its id. Sends no email. */
async function ensureAuthUser(ctx, email, meta) {
  const created = await call(ctx, "/auth/v1/admin/users", {
    method: "POST",
    body: { email, email_confirm: true, user_metadata: meta },
  });
  if (created.ok) return created.json.id;
  if (created.status !== 422 && created.status !== 400) fail(`create auth user: ${created.json?.msg ?? created.json?.message ?? created.text}`);
  // Already registered: a generated (unsent) magic link tells us the user id.
  const link = await call(ctx, "/auth/v1/admin/generate_link", {
    method: "POST",
    body: { type: "magiclink", email },
  });
  if (!link.ok) fail(`look up auth user: ${link.json?.msg ?? link.json?.message ?? link.text}`);
  return link.json.user?.id ?? link.json.id;
}

async function cmdList(ctx) {
  printPeople(await people(ctx));
}

async function cmdGrant(ctx, { positional, flags }) {
  const email = requireEmail(positional[1]);
  const role = requireRole(positional[2]);
  const domain = requireDomainFor(role, flags);
  const lang = flags.lang ?? "da";
  if (!["da", "en"].includes(lang)) fail("--lang must be da or en.");

  let [person] = await people(ctx, email);
  if (!person) {
    const name = typeof flags.name === "string" && flags.name.trim() ? flags.name.trim() : email.split("@")[0];
    [person] = await rest(ctx, "people", {
      method: "POST",
      body: { email, display_name: name, lang },
      prefer: "return=representation",
    });
  } else if (typeof flags.name === "string" && flags.name.trim()) {
    await rest(ctx, "people", {
      method: "PATCH",
      query: { id: `eq.${person.id}` },
      body: { display_name: flags.name.trim() },
      prefer: "return=minimal",
    });
  }

  const userId = await ensureAuthUser(ctx, email, { display_name: person.display_name, lang: person.lang });
  if (!person.user_id) {
    await rest(ctx, "people", {
      method: "PATCH",
      query: { id: `eq.${person.id}`, user_id: "is.null" },
      body: { user_id: userId },
      prefer: "return=minimal",
    });
  }

  const existing = (person.memberships ?? []).find((m) => m.role === role && (m.domain_id ?? null) === domain);
  if (existing) {
    await rest(ctx, "memberships", {
      method: "PATCH",
      query: { id: `eq.${existing.id}` },
      body: { status: "active" },
      prefer: "return=minimal",
    });
  } else {
    await rest(ctx, "memberships", {
      method: "POST",
      body: { person_id: person.id, role, domain_id: domain, status: "active" },
      prefer: "return=minimal",
    });
  }
  printPeople(await people(ctx, email));
}

async function cmdRevoke(ctx, { positional, flags }) {
  const email = requireEmail(positional[1]);
  const role = requireRole(positional[2]);
  const domain = requireDomainFor(role, flags);
  const [person] = await people(ctx, email);
  if (!person) fail(`no person with email ${email}.`);
  const m = (person.memberships ?? []).find((x) => x.role === role && (x.domain_id ?? null) === domain);
  if (!m) fail(`${email} does not hold ${role}${domain ? `:${domain}` : ""}.`);
  await rest(ctx, "memberships", {
    method: "PATCH",
    query: { id: `eq.${m.id}` },
    body: { status: "revoked" },
    prefer: "return=minimal",
  });
  printPeople(await people(ctx, email));
}

const commands = { list: cmdList, grant: cmdGrant, revoke: cmdRevoke };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args.positional[0];
  if (!cmd || !commands[cmd]) {
    console.log("usage: pnpm roles list | grant <email> <role> [--domain id] [--name ..] [--lang da|en] | revoke <email> <role> [--domain id]");
    process.exit(cmd ? 1 : 0);
  }
  await commands[cmd](client(), args);
}

main().catch((e) => fail(e.message ?? String(e)));
