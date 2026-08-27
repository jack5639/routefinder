/**
 * Destructive, opt-in attack suite for one explicitly marked disposable
 * Routefinder Supabase project. Secrets and complete project identifiers are
 * never printed.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = {
  url: process.env.SUPABASE_SECURITY_STAGING_URL,
  anonKey: process.env.SUPABASE_SECURITY_STAGING_ANON_KEY,
  serviceKey: process.env.SUPABASE_SECURITY_STAGING_SERVICE_ROLE_KEY,
  dbUrl: process.env.SUPABASE_SECURITY_STAGING_DB_URL,
  projectRef: process.env.SUPABASE_SECURITY_STAGING_PROJECT_REF,
  productionRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
  acknowledgement: process.env.SUPABASE_SECURITY_STAGING_ACK,
};
const exactAcknowledgement = "routefinder-isolated-staging-security-v2";
const sentinelMarker = "routefinder-disposable-security-test-v1";
const expectedMigrations = [
  "202607290001", "202607290002", "202607290003", "202607290004",
  "202607300001", "202607300002", "202607300003", "202607300004",
  "202607300005", "20260731172503",
  "20260801215120", "20260801222228", "20260801223008", "20260801225211",
  "20260801230116", "20260803121300", "20260808152000", "20260808152500",
  "20260808153500", "20260812120000", "20260812130000",
  "20260827202316",
];
const required = ["url", "anonKey", "serviceKey", "dbUrl", "projectRef"];
if (required.some((key) => !env[key]) || env.acknowledgement !== exactAcknowledgement) {
  throw new Error(`Set every isolated SUPABASE_SECURITY_STAGING_* value and acknowledge exactly ${exactAcknowledgement}.`);
}
if (!/^[a-z0-9-]{8,64}$/.test(env.projectRef)) throw new Error("The isolated project reference is invalid.");
const urlRef = new URL(env.url).hostname.split(".")[0];
if (urlRef !== env.projectRef) throw new Error("The explicit isolated project reference does not match the Supabase URL.");
if (env.productionRef && env.projectRef === env.productionRef) throw new Error("The isolated project reference matches the configured production project.");

const admin = createClient(env.url, env.serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(env.url, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
const createdUsers = [];
const stamp = randomUUID();
let opportunityId;
let cleanupError;

function redacted(value) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
function fail(error, message) {
  if (error) throw new Error(`${message}: ${error.message}`);
}
function denied(result, message) {
  assert.ok(result.error || (Array.isArray(result.data) && result.data.length === 0) || result.data === null, message);
}
function sql(query) {
  return execFileSync("psql", [env.dbUrl, "--no-psqlrc", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--command", query], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
async function makeStudent(label) {
  const email = `security-${label}-${stamp}@example.test`;
  const password = `Routefinder!${randomUUID()}`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  fail(created.error, "Could not create synthetic test user");
  createdUsers.push(created.data.user.id);
  const authClient = createClient(env.url, env.anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const signedIn = await authClient.auth.signInWithPassword({ email, password });
  fail(signedIn.error, "Could not obtain a synthetic student session");
  return {
    id: created.data.user.id,
    client: createClient(env.url, env.anonKey, {
      global: { headers: { Authorization: `Bearer ${signedIn.data.session.access_token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}
async function insert(table, row) {
  const result = await admin.from(table).insert(row).select().single();
  fail(result.error, `Could not seed ${table}`);
  return result.data;
}
async function cleanup() {
  const errors = [];
  if (createdUsers.length) {
    for (const table of ["analytics_events", "audit_events", "source_issues", "orders"]) {
      const result = await admin.from(table).delete().in("user_id", createdUsers);
      if (result.error) errors.push(`${table}: ${result.error.message}`);
    }
  }
  for (const id of createdUsers) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error && !/not found/i.test(result.error.message)) errors.push(`auth user: ${result.error.message}`);
  }
  if (opportunityId) {
    const result = await admin.from("opportunities").delete().eq("id", opportunityId);
    if (result.error) errors.push(`opportunity: ${result.error.message}`);
  }
  if (createdUsers.length) {
    const remaining = await admin.from("profiles").select("id", { count: "exact", head: true }).in("id", createdUsers);
    if (remaining.error || remaining.count !== 0) errors.push("student-owned rows remain after cleanup");
  }
  const fixture = await admin.from("opportunities").select("id", { count: "exact", head: true }).eq("source_authority", `security-${stamp}`);
  if (fixture.error || fixture.count !== 0) errors.push("catalogue fixture remains after cleanup");
  if (errors.length) throw new Error(`Cleanup failed: ${errors.join("; ")}`);
}

async function main() {
  const sentinel = sql(`select count(*) from public.environment_sentinels where purpose = 'security-test' and project_ref = '${env.projectRef}' and marker = '${sentinelMarker}';`);
  assert.equal(sentinel, "1", "Disposable security-test database sentinel is absent or does not match");

  const migrations = sql("select version from supabase_migrations.schema_migrations order by version;").split("\n");
  for (const version of expectedMigrations) assert.ok(migrations.includes(version), `Required migration ${version} is absent`);

  const expectedRlsTables = [
    "profiles", "qualifications", "consent_records", "opportunities", "requirements",
    "portfolio_items", "evidence_items", "evidence_requirement_links", "tasks",
    "applications", "orders", "audit_events", "analytics_events", "payment_offers",
    "checkout_reservations", "catalogue_observations", "catalogue_fact_revisions",
    "environment_sentinels", "catalogue_manual_revisions",
  ];
  const rlsCount = sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${expectedRlsTables.map((name) => `'${name}'`).join(",")}) and c.relrowsecurity;`);
  assert.equal(Number(rlsCount), expectedRlsTables.length, "RLS is missing from a required commercial table");

  const triggerCount = sql("select count(*) from pg_trigger where tgname in ('portfolio_item_security','evidence_item_security','evidence_requirement_link_security','task_security','plan_refresh_security','application_security','source_issue_security') and not tgisinternal;");
  assert.equal(triggerCount, "7", "A required relationship or entitlement trigger is missing");
  const serviceFunctions = ["replace_readiness_profile", "save_readiness_profile", "save_evidence_requirement_link", "replace_weekly_plan", "consume_rate_limit", "reserve_cycle_checkout", "apply_stripe_payment_event", "fail_stripe_payment_event", "begin_catalogue_source_run", "ingest_catalogue_observation_batch", "finish_catalogue_source_run", "review_catalogue_revision", "review_catalogue_publication", "review_catalogue_fact_mutation", "maintain_catalogue_operations", "create_catalogue_manual_draft", "catalogue_review_queue", "resolve_catalogue_source_issue", "verify_catalogue_opportunity_cycle", "routefinder_release_probe"];
  for (const name of serviceFunctions) {
    const browserGrant = sql(`select count(*) from information_schema.routine_privileges where specific_schema='public' and routine_name='${name}' and grantee in ('PUBLIC','anon','authenticated') and privilege_type='EXECUTE';`);
    assert.equal(browserGrant, "0", `${name} is executable by a browser role`);
    const serviceGrant = sql(`select count(*) from information_schema.routine_privileges where specific_schema='public' and routine_name='${name}' and grantee='service_role' and privilege_type='EXECUTE';`);
    assert.ok(Number(serviceGrant) >= 1, `${name} is not executable by service_role`);
  }

  const [a, b] = await Promise.all([makeStudent("a"), makeStudent("b")]);
  await insert("profiles", { id: a.id, application_cycle: 2027 });
  const profileB = await insert("profiles", { id: b.id, application_cycle: 2027 });
  const opportunity = await insert("opportunities", {
    kind: "university-course", sector: "technology", title: `Security fixture ${stamp}`, provider_name: "Synthetic test provider",
    location: "London", summary: "Synthetic security fixture", application_url: "https://example.test/apply",
    source_url: "https://example.test/source", source_authority: `security-${stamp}`, source_id: stamp,
    retrieved_at: new Date().toISOString(), verified_at: new Date().toISOString(), freshness_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    application_cycle: 2027, freshness: "high", state: "open", publication_state: "published",
    raw_snapshot: { restricted: true },
  });
  opportunityId = opportunity.id;
  const requirement = await insert("requirements", { opportunity_id: opportunity.id, kind: "qualification", label: "Synthetic", supporting_text: "Synthetic", source_url: "https://example.test/source", retrieved_at: new Date().toISOString(), verified_at: new Date().toISOString(), freshness_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), freshness: "high", publication_state: "published" });
  const portfolioA = await insert("portfolio_items", { user_id: a.id, opportunity_id: opportunity.id });
  const portfolioB = await insert("portfolio_items", { user_id: b.id, opportunity_id: opportunity.id });
  const evidenceA = await insert("evidence_items", { user_id: a.id, evidence_type: "activity", happened: "Synthetic A", contribution: "Synthetic A", outcome: "Synthetic A", learned: "Synthetic A" });
  const evidenceB = await insert("evidence_items", { user_id: b.id, evidence_type: "activity", happened: "Synthetic B", contribution: "Synthetic B", outcome: "Synthetic B", learned: "Synthetic B" });
  const taskA = await insert("tasks", { user_id: a.id, portfolio_item_id: portfolioA.id, requirement_id: requirement.id, title: "A", why_it_matters: "A", effort_minutes: 10 });
  const taskB = await insert("tasks", { user_id: b.id, portfolio_item_id: portfolioB.id, requirement_id: requirement.id, title: "B", why_it_matters: "B", effort_minutes: 10 });
  const applicationB = await insert("applications", { user_id: b.id, portfolio_item_id: portfolioB.id, official_url: "https://example.test/apply" });
  await insert("entitlements", { user_id: a.id });
  await insert("entitlements", { user_id: b.id });
  const audit = await insert("audit_events", { user_id: a.id, action: "synthetic", entity_type: "security", entity_id: stamp });
  const auditB = await insert("audit_events", { user_id: b.id, action: "synthetic", entity_type: "security", entity_id: stamp });

  for (const [table, id] of [["profiles", profileB.id], ["portfolio_items", portfolioB.id], ["evidence_items", evidenceB.id], ["tasks", taskB.id], ["applications", applicationB.id], ["audit_events", auditB.id], ["entitlements", b.id]]) {
    denied(await a.client.from(table).select("*").eq("id", id), `Student A read another student's ${table}`);
    denied(await anon.from(table).select("*").eq("id", id), `Anonymous client read private ${table}`);
  }
  for (const client of [anon, a.client]) {
    denied(await client.from("profiles").update({ home_region: "forged" }).eq("id", a.id).select(), "Browser client updated a profile");
    denied(await client.from("evidence_items").insert({ user_id: a.id, evidence_type: "x", happened: "x", contribution: "x", outcome: "x", learned: "x" }).select(), "Browser client inserted evidence");
    denied(await client.from("audit_events").update({ action: "forged" }).eq("id", audit.id).select(), "Browser client rewrote audit history");
    denied(await client.from("orders").insert({ user_id: a.id }).select(), "Browser client wrote payment history");
  }
  assert.equal((await admin.from("audit_events").select("action").eq("id", audit.id).single()).data?.action, "synthetic", "Audit history changed");

  denied(await anon.from("opportunities").select("raw_snapshot").eq("id", opportunity.id), "Anonymous client read raw catalogue data");
  fail((await anon.from("opportunities").select("id,title").eq("id", opportunity.id).single()).error, "Published allowlisted catalogue fields were unavailable");
  for (const table of ["source_runs", "publication_reviews", "catalogue_observations", "catalogue_fact_revisions", "catalogue_manual_revisions", "payment_offers", "checkout_reservations", "stripe_events", "rate_limit_buckets", "analytics_events", "environment_sentinels"]) {
    denied(await anon.from(table).select("*"), `Anonymous client read ${table}`);
    denied(await a.client.from(table).select("*"), `Authenticated client read ${table}`);
  }

  assert.ok((await admin.from("evidence_requirement_links").insert({ user_id: b.id, evidence_id: evidenceA.id, requirement_id: requirement.id, relevance: "x", coverage: "weak" })).error, "Cross-user evidence link was accepted");
  assert.ok((await admin.from("applications").insert({ user_id: b.id, portfolio_item_id: portfolioA.id, official_url: "https://example.test" })).error, "Cross-user application was accepted");
  assert.ok((await admin.from("tasks").insert({ user_id: b.id, portfolio_item_id: portfolioA.id, requirement_id: requirement.id, title: "x", why_it_matters: "x", effort_minutes: 5 })).error, "Cross-user task was accepted");
  assert.ok((await admin.from("plan_refreshes").insert({ user_id: b.id, input_hash: stamp, selected_task_ids: [taskA.id] })).error, "Cross-user refresh was accepted");

  const evidenceRace = await Promise.all(Array.from({ length: 12 }, (_, index) => admin.from("evidence_items").insert({ user_id: a.id, evidence_type: "race", happened: String(index), contribution: "race", outcome: "race", learned: "race" }).select("id")));
  assert.ok(evidenceRace.filter((result) => !result.error).length <= 9, "Concurrent evidence inserts exceeded the Free limit");
  assert.ok(evidenceRace.some((result) => result.error?.message.includes("entitlement_limit:evidence_items")), "The evidence race did not reach the database limit");

  const rateRace = await Promise.all(Array.from({ length: 8 }, () => admin.rpc("consume_rate_limit", { bucket_key: `race-${stamp}`, maximum: 3, window_seconds: 60 })));
  assert.equal(rateRace.filter((result) => result.data === true).length, 3, "Concurrent rate limiting exceeded its maximum");
  for (const [name, args] of [
    ["consume_rate_limit", { bucket_key: `x-${stamp}`, maximum: 1, window_seconds: 60 }],
    ["replace_readiness_profile", { p_user_id: a.id, p_profile: {}, p_qualifications: [] }],
    ["save_readiness_profile", { p_user_id: a.id, p_profile: {}, p_qualifications: [], p_policy_version: "x" }],
    ["save_evidence_requirement_link", { p_user_id: a.id, p_evidence_id: evidenceA.id, p_requirement_id: requirement.id, p_relevance: "x", p_coverage: "weak", p_missing_specificity: "", p_confirmed_by_student: false, p_input_hash: stamp }],
    ["replace_weekly_plan", { p_user_id: a.id, p_input_hash: stamp, p_tasks: [] }],
    ["reserve_cycle_checkout", { p_user_id: a.id, p_application_cycle: 2030 }],
    ["apply_stripe_payment_event", {}],
    ["fail_stripe_payment_event", { p_event_id: "evt_x", p_event_type: "x", p_event_created_at: 1, p_error_code: "x" }],
    ["review_catalogue_publication", { p_opportunity_id: opportunity.id, p_reviewer_id: a.id, p_decision: "published", p_note: "forged" }],
    ["maintain_catalogue_operations", {}],
    ["verify_catalogue_opportunity_cycle", { p_opportunity_id: opportunity.id, p_reviewer_id: a.id, p_application_cycle: 2027, p_note: "forged" }],
  ]) {
    assert.ok((await anon.rpc(name, args)).error, `Anonymous client invoked ${name}`);
    assert.ok((await a.client.rpc(name, args)).error, `Authenticated client invoked ${name}`);
  }

  console.log(JSON.stringify({
    suite: "supabase-security", status: "passed", environment: "isolated-staging",
    project: redacted(env.projectRef), migrationVersions: migrations,
    categories: ["migration-ledger", "rls-grants-triggers", "cross-user", "browser-write-denial", "raw-catalogue-denial", "relationship-constraints", "concurrent-limits", "service-rpc-denial", "audit-payment-immutability"],
    cleanup: "pending",
  }));
}

try {
  await main();
} catch (error) {
  process.exitCode = 1;
  throw error;
} finally {
  try {
    await cleanup();
    console.log(JSON.stringify({ suite: "supabase-security-cleanup", status: "passed", project: redacted(env.projectRef) }));
  } catch (error) {
    cleanupError = error;
    process.exitCode = 1;
    console.error(JSON.stringify({ suite: "supabase-security-cleanup", status: "failed", project: redacted(env.projectRef), error: "synthetic cleanup failed" }));
  }
}
if (cleanupError) throw cleanupError;
