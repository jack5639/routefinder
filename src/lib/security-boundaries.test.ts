import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202607290001_customer_ready_mvp.sql", "utf8");

describe("database security boundary", () => {
  const studentTables = [
    "profiles",
    "qualifications",
    "consent_records",
    "portfolio_items",
    "evidence_items",
    "evidence_requirement_links",
    "assessment_versions",
    "tasks",
    "plan_refreshes",
    "applications",
    "entitlements",
    "orders",
    "audit_events",
    "analytics_events",
    "source_issues",
    "prototype_imports",
  ];

  it.each(studentTables)("enables RLS for %s", (table) => {
    expect(migration).toContain(`alter table public.${table} enable row level security;`);
  });

  it("does not allow anonymous callers to mutate rate-limit buckets", () => {
    expect(migration).toContain("revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;");
    expect(migration).toContain("to authenticated, service_role;");
  });

  it("limits public catalogue reads to published facts", () => {
    expect(migration).toContain("using (publication_state = 'published')");
  });
});
