import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const env = {
  sourceDb: process.env.SUPABASE_STAGING_DB_URL,
  sourceRef: process.env.SUPABASE_STAGING_PROJECT_REF,
  targetDb: process.env.SUPABASE_RESTORE_TEST_DB_URL,
  targetUrl: process.env.SUPABASE_RESTORE_TEST_URL,
  targetServiceKey: process.env.SUPABASE_RESTORE_TEST_SERVICE_ROLE_KEY,
  targetRef: process.env.SUPABASE_RESTORE_TEST_PROJECT_REF,
  productionRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
  acknowledgement: process.env.RESTORE_TEST_ACK,
  deletionLedgerUrl: process.env.DELETION_LEDGER_URL,
  deletionLedgerBearerToken: process.env.DELETION_LEDGER_BEARER_TOKEN,
};
const acknowledgement = "routefinder-disposable-restore-test-v2";
const sentinelMarker = "routefinder-disposable-restore-test-v1";
const expectedMigrations = [
  "202607290001", "202607290002", "202607290003", "202607290004",
  "202607300001", "202607300002", "202607300003", "202607300004",
  "202607300005", "20260731172503",
];
if (Object.entries(env).some(([key, value]) => key !== "productionRef" && key !== "acknowledgement" && !value) || env.acknowledgement !== acknowledgement) {
  throw new Error(`Set the source and disposable restore-target variables and acknowledge exactly ${acknowledgement}.`);
}
if (env.sourceDb === env.targetDb || env.sourceRef === env.targetRef) throw new Error("Restore source and target must be distinct projects and database URLs.");
if (env.productionRef && [env.sourceRef, env.targetRef].includes(env.productionRef)) throw new Error("Restore verification refuses a configured production project.");
if (new URL(env.targetUrl).hostname.split(".")[0] !== env.targetRef) throw new Error("Restore target URL does not match its explicit project reference.");
for (const ref of [env.sourceRef, env.targetRef]) {
  if (!/^[a-z0-9-]{8,64}$/.test(ref)) throw new Error("A restore project reference is invalid.");
}

const directory = mkdtempSync(join(tmpdir(), "routefinder-restore-"));
const archive = join(directory, "staging.dump");
const fixtureArchive = join(directory, "fixture-before-deletion.dump");
const stamp = randomUUID();
const admin = createClient(env.targetUrl, env.targetServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
let userId;
let opportunityId;
let retainedOrderId;
let retainedAuditId;

function redacted(value) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
function sql(databaseUrl, query) {
  return execFileSync("psql", [databaseUrl, "--no-psqlrc", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--command", query], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function run(command, args) {
  execFileSync(command, args, { stdio: ["ignore", "ignore", "pipe"] });
}
function fail(error, message) {
  if (error) throw new Error(`${message}: ${error.message}`);
}
function isLedgerEntry(value) {
  return value && typeof value === "object" && typeof value.id === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.subject_id)
    && typeof value.deleted_at === "string" && !Number.isNaN(new Date(value.deleted_at).valueOf())
    && value.reason === "account-deletion";
}
async function ledgerRequest(url, init) {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${env.deletionLedgerBearerToken}`, accept: "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(`Deletion ledger request failed with ${response.status}`);
  return response.json();
}
async function recordDeletionLedgerEntry(subjectId, deletedAt) {
  const body = await ledgerRequest(env.deletionLedgerUrl, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ subject_id: subjectId, deleted_at: deletedAt, reason: "account-deletion" }),
  });
  if (!body || !isLedgerEntry(body.entry) || body.entry.subject_id !== subjectId || body.entry.deleted_at !== deletedAt) {
    throw new Error("Deletion ledger returned an invalid durable write receipt");
  }
}
async function loadDeletionReplay(from, through) {
  const endpoint = new URL(env.deletionLedgerUrl);
  endpoint.searchParams.set("from", from);
  endpoint.searchParams.set("through", through);
  const body = await ledgerRequest(endpoint, { method: "GET" });
  if (!body || body.complete !== true || !Array.isArray(body.entries) || typeof body.coverage_through !== "string"
    || Number.isNaN(new Date(body.coverage_through).valueOf()) || new Date(body.coverage_through) < new Date(through)
    || body.entries.some((entry) => !isLedgerEntry(entry) || new Date(entry.deleted_at) <= new Date(from) || new Date(entry.deleted_at) > new Date(through))) {
    throw new Error("Deletion ledger replay batch is incomplete, malformed, or out of range");
  }
  return body.entries;
}
async function insert(table, row) {
  const result = await admin.from(table).insert(row).select().single();
  fail(result.error, `Could not create synthetic ${table}`);
  return result.data;
}
async function cleanup() {
  const errors = [];
  if (userId) {
    const deleted = await admin.auth.admin.deleteUser(userId);
    if (deleted.error && !/not found/i.test(deleted.error.message)) errors.push("auth user");
  }
  for (const [table, id] of [["orders", retainedOrderId], ["audit_events", retainedAuditId], ["opportunities", opportunityId]]) {
    if (!id) continue;
    const result = await admin.from(table).delete().eq("id", id);
    if (result.error) errors.push(table);
  }
  if (errors.length) throw new Error(`Restore synthetic cleanup failed for ${errors.join(", ")}`);
}

try {
  const sentinel = sql(env.targetDb, `select count(*) from public.environment_sentinels where purpose='restore-test' and project_ref='${env.targetRef}' and marker='${sentinelMarker}';`);
  assert.equal(sentinel, "1", "The restore target does not carry the exact disposable restore-test sentinel");

  run("pg_dump", ["--format=custom", "--no-owner", "--file", archive, env.sourceDb]);
  run("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", env.targetDb, archive]);

  const migrations = sql(env.targetDb, "select version from supabase_migrations.schema_migrations order by version;").split("\n");
  for (const version of expectedMigrations) assert.ok(migrations.includes(version), `Restored database is missing migration ${version}`);
  const tables = ["profiles", "qualifications", "portfolio_items", "evidence_items", "evidence_requirement_links", "tasks", "applications", "orders", "audit_events"];
  assert.equal(Number(sql(env.targetDb, `select count(*) from information_schema.tables where table_schema='public' and table_name in (${tables.map((name) => `'${name}'`).join(",")});`)), tables.length, "A required restored table is missing");
  assert.equal(Number(sql(env.targetDb, `select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in (${tables.map((name) => `'${name}'`).join(",")}) and c.relrowsecurity;`)), tables.length, "RLS is missing after restore");
  assert.equal(sql(env.targetDb, "select count(*) from pg_trigger where tgname in ('portfolio_item_security','evidence_item_security','evidence_requirement_link_security','task_security','application_security') and not tgisinternal;"), "5", "A required trigger is missing after restore");
  for (const fn of ["save_readiness_profile", "save_evidence_requirement_link", "replace_weekly_plan", "reserve_cycle_checkout", "apply_stripe_payment_event"]) {
    assert.equal(sql(env.targetDb, `select count(*) from information_schema.routine_privileges where specific_schema='public' and routine_name='${fn}' and grantee in ('PUBLIC','anon','authenticated') and privilege_type='EXECUTE';`), "0", `${fn} has a browser-role grant after restore`);
  }
  assert.equal(sql(env.targetDb, "select count(*) from information_schema.routine_privileges where specific_schema='public' and routine_name='replay_deleted_subject' and grantee in ('PUBLIC','anon','authenticated') and privilege_type='EXECUTE';"), "0", "Deletion replay has a browser-role grant after restore");
  assert.equal(sql(env.targetDb, "select count(*) from public.profiles p left join auth.users u on u.id=p.id where u.id is null;"), "0", "A restored profile has a broken auth reference");

  const created = await admin.auth.admin.createUser({ email: `restore-${stamp}@example.test`, password: `Routefinder!${randomUUID()}`, email_confirm: true });
  fail(created.error, "Could not create the restore-test authentication user");
  userId = created.data.user.id;
  await insert("profiles", { id: userId, current_stage: "Year 13", application_cycle: new Date().getUTCFullYear() + 1, qualifications_complete: true });
  await insert("qualifications", { user_id: userId, qualification_type: "A level", subject: "Mathematics", grade: "A", status: "predicted" });
  const opportunity = await insert("opportunities", { kind: "external", sector: "technology", title: `Restore fixture ${stamp}`, provider_name: "Synthetic restore provider", location: "London", summary: "Synthetic restore fixture", application_url: "https://example.test/apply", source_url: "https://example.test/source", source_authority: `restore-${stamp}`, source_id: stamp, retrieved_at: new Date().toISOString(), freshness: "high", state: "open", publication_state: "published" });
  opportunityId = opportunity.id;
  const requirement = await insert("requirements", { opportunity_id: opportunity.id, kind: "evidence", label: "Project evidence", supporting_text: "Synthetic", source_url: "https://example.test/source", retrieved_at: new Date().toISOString(), freshness: "high", publication_state: "published" });
  const portfolio = await insert("portfolio_items", { user_id: userId, opportunity_id: opportunity.id });
  const evidence = await insert("evidence_items", { user_id: userId, evidence_type: "project", happened: "Built a synthetic test", contribution: "Implemented the test", outcome: "Verified restore behavior", learned: "How restore verification works" });
  await insert("evidence_requirement_links", { user_id: userId, evidence_id: evidence.id, requirement_id: requirement.id, relevance: "Synthetic mapping", coverage: "supported" });
  await insert("tasks", { user_id: userId, portfolio_item_id: portfolio.id, requirement_id: requirement.id, title: "Verify restored task", why_it_matters: "Checks restored relationships", effort_minutes: 10 });
  await insert("applications", { user_id: userId, portfolio_item_id: portfolio.id, official_url: "https://example.test/apply", next_action: "Synthetic next action" });

  for (const table of ["profiles", "qualifications", "portfolio_items", "evidence_items", "evidence_requirement_links", "tasks", "applications"]) {
    const column = table === "profiles" ? "id" : "user_id";
    const result = await admin.from(table).select("*").eq(column, userId);
    fail(result.error, `Export-equivalent query failed for ${table}`);
    assert.ok(result.data.length > 0, `Export-equivalent query omitted ${table}`);
  }

  const order = await insert("orders", { user_id: userId, stripe_checkout_session_id: `restore-${stamp}`, amount_pence: 5900, currency: "gbp", offer: "standard", status: "paid", purchased_at: new Date().toISOString() });
  retainedOrderId = order.id;
  const audit = await insert("audit_events", { user_id: userId, action: "restore.synthetic", entity_type: "restore-test", entity_id: stamp });
  retainedAuditId = audit.id;
  const backupPoint = new Date().toISOString();
  run("pg_dump", ["--format=custom", "--no-owner", "--file", fixtureArchive, env.targetDb]);
  const deletedAt = new Date().toISOString();
  assert.ok(deletedAt > backupPoint, "Deletion did not occur after the synthetic backup point");
  await recordDeletionLedgerEntry(userId, deletedAt);
  const deleted = await admin.auth.admin.deleteUser(userId);
  fail(deleted.error, "Synthetic account deletion failed");
  userId = undefined;

  assert.equal((await admin.from("profiles").select("id", { count: "exact", head: true }).eq("id", created.data.user.id)).count, 0, "Student-owned rows did not cascade");
  assert.equal((await admin.from("orders").select("user_id").eq("id", retainedOrderId).single()).data?.user_id, null, "Retained payment record was not anonymised");
  assert.equal((await admin.from("audit_events").select("user_id").eq("id", retainedAuditId).single()).data?.user_id, null, "Retained audit record was not anonymised");

  // Restore the synthetic pre-deletion backup. It must visibly reintroduce the
  // account before replay, proving this is a recovery test rather than a normal
  // delete-cycle test.
  run("pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", env.targetDb, fixtureArchive]);
  assert.ok(Number((await admin.from("profiles").select("id", { count: "exact", head: true }).eq("id", created.data.user.id)).count) > 0, "Synthetic backup did not reintroduce the deleted profile");

  const replayThrough = new Date().toISOString();
  const entries = await loadDeletionReplay(backupPoint, replayThrough);
  assert.ok(entries.some((entry) => entry.subject_id === created.data.user.id), "Deletion ledger did not retain the post-backup deletion");
  for (const entry of entries) {
    const authDelete = await admin.auth.admin.deleteUser(entry.subject_id);
    if (authDelete.error && !/not found/i.test(authDelete.error.message)) fail(authDelete.error, "Replay could not delete restored authentication user");
    const replay = await admin.rpc("replay_deleted_subject", { p_user_id: entry.subject_id });
    fail(replay.error, "Replay could not remove restored student-owned records");
  }
  for (const table of ["profiles", "qualifications", "portfolio_items", "evidence_items", "evidence_requirement_links", "tasks", "applications"]) {
    const column = table === "profiles" ? "id" : "user_id";
    assert.equal((await admin.from(table).select("*", { count: "exact", head: true }).eq(column, created.data.user.id)).count, 0, `Replay left restored ${table}`);
  }
  assert.equal((await admin.from("orders").select("user_id").eq("id", retainedOrderId).single()).data?.user_id, null, "Replay did not preserve retained payment anonymisation");
  assert.equal((await admin.from("audit_events").select("user_id").eq("id", retainedAuditId).single()).data?.user_id, null, "Replay did not preserve retained audit anonymisation");

  // Replaying the same batch must be a no-op, not an error or a recreation.
  for (const entry of entries) {
    const replay = await admin.rpc("replay_deleted_subject", { p_user_id: entry.subject_id });
    fail(replay.error, "Deletion replay is not idempotent");
  }

  console.log(JSON.stringify({
    suite: "backup-restore", status: "passed", source: redacted(env.sourceRef), target: redacted(env.targetRef),
    migrationVersions: migrations, verified: ["distinct-target-sentinel", "schema-security", "auth-references", "synthetic-commercial-cycle", "export-equivalent-queries", "account-cascade", "retained-record-anonymisation", "post-backup-restoration", "durable-ledger-replay", "idempotent-replay", "cleanup"],
  }));
} finally {
  try {
    await cleanup();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
