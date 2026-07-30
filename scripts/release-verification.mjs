import { spawnSync } from "node:child_process";

const strictRelease = process.argv.includes("--release");
const exactAcknowledgement = "routefinder-release-verification-v1";
const packageRunner = process.env.npm_execpath;
if (!packageRunner) throw new Error("Run release verification through pnpm.");

const normalSuites = [
  ["unit", ["test"]],
  ["lint", ["lint"]],
  ["typecheck", ["typecheck"]],
  ["docs", ["docs:check"]],
  ["build", ["build"]],
  ["public-e2e", ["test:e2e"]],
];
const isolatedSuites = [
  ["supabase-security", "RELEASE_VERIFY_SUPABASE_SECURITY", ["test:supabase-security"]],
  ["commercial-e2e", "RELEASE_VERIFY_COMMERCIAL_E2E", ["test:e2e:commercial"]],
  ["stripe-staging", "RELEASE_VERIFY_STRIPE_STAGING", ["test:stripe-staging"]],
  ["backup-restore", "RELEASE_VERIFY_RESTORE", ["db:restore-test"]],
];
const results = [];

function run(name, args) {
  process.stdout.write(`[release] ${name} ... `);
  const result = spawnSync(process.execPath, [packageRunner, ...args], {
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });
  const status = result.status === 0 ? "passed" : "failed";
  results.push({ suite: name, status });
  process.stdout.write(`${status}\n`);
  return result.status === 0;
}

let passed = true;
if (strictRelease && process.env.RELEASE_VERIFY_ACK !== exactAcknowledgement) {
  throw new Error(`Strict release verification requires RELEASE_VERIFY_ACK=${exactAcknowledgement}.`);
}
for (const [name, args] of normalSuites) passed = run(name, args) && passed;
for (const [name, flag, args] of isolatedSuites) {
  if (!strictRelease) {
    results.push({ suite: name, status: "not-requested" });
    continue;
  }
  if (process.env[flag] !== "1") {
    results.push({ suite: name, status: "required-but-skipped" });
    passed = false;
    process.stdout.write(`[release] ${name} required-but-skipped (set ${flag}=1)\n`);
    continue;
  }
  passed = run(name, args) && passed;
}

const summary = {
  schemaVersion: 1,
  mode: strictRelease ? "strict-release" : "local",
  status: passed ? "passed" : "failed",
  suites: results,
};
console.log(JSON.stringify(summary));
if (!passed) process.exitCode = 1;
