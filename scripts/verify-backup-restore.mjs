import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const source = process.env.SUPABASE_STAGING_DB_URL;
const target = process.env.SUPABASE_RESTORE_TEST_DB_URL;
if (!source || !target || process.env.RESTORE_TEST_ACK !== "routefinder-restore-test") {
  throw new Error("Set distinct staging and restore-test database URLs plus RESTORE_TEST_ACK=routefinder-restore-test.");
}
if (new URL(source).host === new URL(target).host) throw new Error("Restore target must not be the source database.");

const directory = mkdtempSync(join(tmpdir(), "routefinder-restore-"));
const archive = join(directory, "staging.dump");
for (const [command, args] of [
  ["pg_dump", ["--format=custom", "--no-owner", "--file", archive, source]],
  ["pg_restore", ["--clean", "--if-exists", "--no-owner", "--dbname", target, archive]],
  ["psql", [target, "--tuples-only", "--command", "select count(*) from information_schema.tables where table_schema = 'public';"]],
]) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`);
}
console.log("Restore test completed. Record the date, operator, backup identifier, table count, and follow-up deletion checks.");
