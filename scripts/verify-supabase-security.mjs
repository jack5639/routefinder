/**
 * Opt-in attack suite for an isolated Routefinder staging project.
 * It intentionally talks to PostgREST as anon and two real authenticated users.
 * It never accepts production URLs and removes its synthetic auth users in finally.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_SECURITY_STAGING_URL;
const anonKey = process.env.SUPABASE_SECURITY_STAGING_ANON_KEY;
const serviceKey = process.env.SUPABASE_SECURITY_STAGING_SERVICE_ROLE_KEY;
const dbUrl = process.env.SUPABASE_SECURITY_STAGING_DB_URL;
const acknowledgement = process.env.SUPABASE_SECURITY_STAGING_ACK;

if (!url || !anonKey || !serviceKey || !dbUrl || acknowledgement !== "routefinder-isolated-staging-security") {
  throw new Error("Set isolated SUPABASE_SECURITY_STAGING_* values and SUPABASE_SECURITY_STAGING_ACK=routefinder-isolated-staging-security.");
}
if (/prod(uction)?/i.test(new URL(url).hostname) || /prod(uction)?/i.test(new URL(dbUrl).hostname)) {
  throw new Error("This destructive synthetic-account suite must never target a production project.");
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const createdUsers = [];
const stamp = randomUUID();

function fail(error, message) {
  if (error) throw new Error(`${message}: ${error.message}`);
}
function denied(result, message) {
  assert.ok(result.error || (Array.isArray(result.data) && result.data.length === 0) || result.data === null, message);
}
function sql(query) {
  return execFileSync("psql", [dbUrl, "--no-psqlrc", "--tuples-only", "--no-align", "--command", query], { encoding: "utf8" }).trim();
}
async function makeStudent(label) {
  const email = `security-${label}-${stamp}@example.test`;
  const password = `Routefinder!${randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  fail(created.error, "Could not create synthetic test user");
  createdUsers.push(created.data.user.id);
  const signedIn = await createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } }).auth.signInWithPassword({ email, password });
  fail(signedIn.error, "Could not obtain synthetic student JWT");
  return { id: created.data.user.id, client: createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${signedIn.data.session.access_token}` } }, auth: { autoRefreshToken: false, persistSession: false } }) };
}
async function insert(table, row) {
  const result = await admin.from(table).insert(row).select().single();
  fail(result.error, `Could not seed ${table}`);
  return result.data;
}

async function main() {
  const expectedMigration = "202607290004";
  const migrations = sql("select version from supabase_migrations.schema_migrations order by version;").split("\n");
  assert.ok(migrations.includes("202607290001"), "Migration 001 is absent from this staging project");
  assert.ok(migrations.includes(expectedMigration), "Forward security migration 004 is absent from this staging project");

  // Verify deployment metadata before attack cases. This is intentionally SQL,
  // because PostgREST cannot inspect grants, triggers, or migration history.
  const rlsTables = sql("select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('profiles','evidence_items','tasks','orders','payment_offers','checkout_reservations') and c.relrowsecurity;");
  assert.equal(rlsTables, "6", "Expected RLS is not enabled on every sampled commercial table");
  const triggers = sql("select count(*) from pg_trigger where tgname in ('portfolio_item_security','evidence_item_security','evidence_requirement_link_security','task_security','plan_refresh_security','application_security','source_issue_security') and not tgisinternal;");
  assert.equal(triggers, "7", "Expected ownership/relationship triggers are missing");

  const [a, b] = await Promise.all([makeStudent("a"), makeStudent("b")]);
  await insert("profiles", { id: a.id, application_cycle: new Date().getUTCFullYear() + 1 });
  const profileB = await insert("profiles", { id: b.id, application_cycle: new Date().getUTCFullYear() + 1 });
  const opportunity = await insert("opportunities", { kind: "external", sector: "technology", title: `Security fixture ${stamp}`, provider_name: "Test", location: "London", summary: "Synthetic record", application_url: "https://example.test/apply", source_url: "https://example.test/source", source_authority: `security-${stamp}`, source_id: stamp, retrieved_at: new Date().toISOString(), freshness: "high", state: "open", publication_state: "published", raw_snapshot: { private: true } });
  const requirement = await insert("requirements", { opportunity_id: opportunity.id, kind: "qualification", label: "Synthetic", supporting_text: "Synthetic", source_url: "https://example.test/source", retrieved_at: new Date().toISOString(), freshness: "high", publication_state: "published" });
  const portfolioA = await insert("portfolio_items", { user_id: a.id, opportunity_id: opportunity.id });
  const portfolioB = await insert("portfolio_items", { user_id: b.id, opportunity_id: opportunity.id });
  const evidenceA = await insert("evidence_items", { user_id: a.id, evidence_type: "activity", happened: "A", contribution: "A", outcome: "A", learned: "A" });
  const evidenceB = await insert("evidence_items", { user_id: b.id, evidence_type: "activity", happened: "B", contribution: "B", outcome: "B", learned: "B" });
  const taskA = await insert("tasks", { user_id: a.id, portfolio_item_id: portfolioA.id, requirement_id: requirement.id, title: "A", why_it_matters: "A", effort_minutes: 10 });
  const taskB = await insert("tasks", { user_id: b.id, portfolio_item_id: portfolioB.id, requirement_id: requirement.id, title: "B", why_it_matters: "B", effort_minutes: 10 });
  await insert("applications", { user_id: a.id, portfolio_item_id: portfolioA.id, official_url: "https://example.test/apply" });
  const applicationB = await insert("applications", { user_id: b.id, portfolio_item_id: portfolioB.id, official_url: "https://example.test/apply" });
  await insert("entitlements", { user_id: a.id });
  await insert("entitlements", { user_id: b.id });
  const audit = await insert("audit_events", { user_id: a.id, action: "synthetic", entity_type: "security" });
  const auditB = await insert("audit_events", { user_id: b.id, action: "synthetic", entity_type: "security" });

  // Cross-user reads: an error or zero rows is a denial; a foreign row is not.
  for (const [table, id] of [["profiles", profileB.id], ["portfolio_items", portfolioB.id], ["evidence_items", evidenceB.id], ["tasks", taskB.id], ["applications", applicationB.id], ["audit_events", auditB.id], ["entitlements", b.id]]) {
    denied(await a.client.from(table).select("*").eq("id", id), `Student A read ${table} belonging to another user`);
    denied(await anon.from(table).select("*").eq("id", id), `Anonymous client read private ${table}`);
  }

  // Direct browser writes are forbidden even when RLS would identify the user.
  for (const client of [anon, a.client]) {
    denied(await client.from("profiles").update({ home_region: "forged" }).eq("id", a.id).select(), "Browser client updated a profile");
    denied(await client.from("evidence_items").insert({ user_id: a.id, evidence_type: "x", happened: "x", contribution: "x", outcome: "x", learned: "x" }).select(), "Browser client inserted evidence");
    denied(await client.from("audit_events").update({ action: "forged" }).eq("id", audit.id).select(), "Browser client rewrote audit history");
    denied(await client.from("entitlements").update({ plan: "cycle" }).eq("user_id", a.id).select(), "Browser client changed an entitlement");
  }
  const unchangedAudit = await admin.from("audit_events").select("action").eq("id", audit.id).single();
  assert.equal(unchangedAudit.data?.action, "synthetic", "Audit record changed after attack");

  denied(await anon.from("opportunities").select("raw_snapshot").eq("id", opportunity.id), "Anonymous client read a raw snapshot");
  const published = await anon.from("opportunities").select("id,title").eq("id", opportunity.id).single();
  fail(published.error, "Anonymous client could not read allowlisted published catalogue fields");
  for (const table of ["source_runs", "publication_reviews", "payment_offers", "checkout_reservations", "stripe_events", "rate_limit_buckets", "analytics_events"]) {
    denied(await anon.from(table).select("*"), `Anonymous client read ${table}`);
  }

  // These are privileged direct-table writes, not API calls. Their failures
  // prove the database constraints and triggers below application validation.
  assert.ok((await admin.from("evidence_requirement_links").insert({ user_id: b.id, evidence_id: evidenceA.id, requirement_id: requirement.id, relevance: "x", coverage: "weak" })).error, "Cross-user evidence link was accepted");
  assert.ok((await admin.from("applications").insert({ user_id: b.id, portfolio_item_id: portfolioA.id, official_url: "https://example.test" })).error, "Cross-user application was accepted");
  assert.ok((await admin.from("tasks").insert({ user_id: b.id, portfolio_item_id: portfolioA.id, requirement_id: requirement.id, title: "x", why_it_matters: "x", effort_minutes: 5 })).error, "Cross-user task was accepted");
  assert.ok((await admin.from("plan_refreshes").insert({ user_id: b.id, input_hash: stamp, selected_task_ids: [taskA.id] })).error, "Cross-user refresh was accepted");

  // A service role bypasses RLS, so this race exercises the trigger/lock itself.
  // Student A already has one active evidence item; at most nine of these twelve
  // concurrent writes may succeed on the free plan.
  const evidenceRace = await Promise.all(Array.from({ length: 12 }, (_, index) =>
    admin.from("evidence_items").insert({ user_id: a.id, evidence_type: "race", happened: String(index), contribution: "race", outcome: "race", learned: "race" }).select("id"),
  ));
  const evidenceSuccesses = evidenceRace.filter((result) => !result.error).length;
  assert.ok(evidenceSuccesses <= 9, "Concurrent evidence inserts exceeded the free entitlement limit");
  assert.ok(evidenceRace.some((result) => result.error?.message.includes("entitlement_limit:evidence_items")), "Evidence race did not report the database entitlement limit");
  const storedEvidence = await admin.from("evidence_items").select("id", { count: "exact", head: true }).eq("user_id", a.id).eq("archived", false);
  assert.ok((storedEvidence.count ?? 0) <= 10, "Stored evidence exceeds the free entitlement limit");

  const rateRace = await Promise.all(Array.from({ length: 8 }, () => admin.rpc("consume_rate_limit", { bucket_key: `race-${stamp}`, maximum: 3, window_seconds: 60 })));
  assert.equal(rateRace.filter((result) => result.data === true).length, 3, "Concurrent rate-limit calls exceeded the configured maximum");

  for (const [name, args] of [["consume_rate_limit", { bucket_key: `x${stamp}`, maximum: 1, window_seconds: 60 }], ["replace_weekly_plan", { p_user_id: a.id, p_input_hash: stamp, p_tasks: [] }], ["reserve_cycle_checkout", { p_user_id: a.id, p_application_cycle: 2030 }], ["apply_stripe_payment_event", {}], ["reject_stripe_payment_event", {}]]) {
    assert.ok((await anon.rpc(name, args)).error, `Anonymous client invoked ${name}`);
    assert.ok((await a.client.rpc(name, args)).error, `Authenticated client invoked ${name}`);
  }

  console.log(JSON.stringify({ environment: "isolated-staging", migrationVersions: migrations, categories: ["migration-ledger", "rls-and-triggers", "cross-user-reads", "browser-write-denial", "raw-catalogue-denial", "relationship-constraints", "concurrent-entitlement-and-rate-limit", "service-rpc-denial", "audit-integrity"], cleanup: "pending" }));
}

try {
  await main();
} finally {
  await Promise.all(createdUsers.map((id) => admin.auth.admin.deleteUser(id)));
}
