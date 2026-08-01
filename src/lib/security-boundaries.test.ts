import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { analyticsSchema, privacyTermsVersion, profileSchema } from "@/lib/mvp/schemas";

const migration = readFileSync("supabase/migrations/202607290001_customer_ready_mvp.sql", "utf8");
const hardeningMigration = readFileSync("supabase/migrations/202607290002_harden_direct_database_access.sql", "utf8");
const reassertionMigration = readFileSync("supabase/migrations/202607290004_reassert_database_security.sql", "utf8");
const readinessMigration = readFileSync("supabase/migrations/202607300001_transactional_readiness_profile.sql", "utf8");
const releaseMigration = readFileSync("supabase/migrations/202607300004_release_verification_and_atomic_mutations.sql", "utf8");
const catalogueOperationsMigration = readFileSync("supabase/migrations/202607300005_catalogue_publication_operations.sql", "utf8");
const apiContext = readFileSync("src/lib/api-context.ts", "utf8");
const publicCatalogue = readFileSync("src/lib/supabase/public-catalogue.ts", "utf8");

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return routeFiles(path);
    }

    return entry.name === "route.ts" ? [path] : [];
  });
}

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

  it("gives authenticated students read-only commercial table privileges", () => {
    expect(migration).toContain("revoke all privileges on table");
    expect(migration).toContain("from anon, authenticated;");
    expect(migration).not.toMatch(/create policy "[^"]+" on public\.[\s\S]*?\n\s+for (all|insert|update|delete)\b/i);
    expect(migration).not.toContain("users manage own");
    expect(migration).not.toContain("users add own");
  });

  it("keeps rate-limit and weekly-plan functions server-only", () => {
    expect(migration).toContain(
      "revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "revoke all on function public.replace_weekly_plan(uuid, text, jsonb) from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;",
    );
    expect(migration).not.toContain(
      "grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated",
    );
    expect(migration).toContain("invalid_rate_limit_parameters");
    expect(migration).toContain("pg_catalog.least(public.rate_limit_buckets.count + 1, maximum + 1)");
    expect(apiContext).toContain('context.admin.rpc("consume_rate_limit"');
  });

  it("keeps transactional readiness replacement server-only", () => {
    expect(readinessMigration).toContain("add column if not exists qualifications_complete boolean not null default false;");
    expect(readinessMigration).toContain("revoke all on function public.replace_readiness_profile(uuid, jsonb, jsonb) from public, anon, authenticated;");
    expect(readinessMigration).toContain("grant execute on function public.replace_readiness_profile(uuid, jsonb, jsonb) to service_role;");
    expect(readinessMigration).toContain("duplicate_qualification_id");
    expect(readinessMigration).toContain("qualification_not_found");
  });

  it("keeps transactional catalogue publication inaccessible to browser roles", () => {
    expect(catalogueOperationsMigration).toContain("create or replace function public.review_catalogue_publication");
    expect(catalogueOperationsMigration).toContain("grant execute on function public.review_catalogue_publication");
    expect(catalogueOperationsMigration).toContain("to service_role;");
    expect(catalogueOperationsMigration).not.toMatch(/grant execute on function public\.review_catalogue_publication[\s\S]*?\bto (?:anon|authenticated)\b/);
  });

  it("atomically records readiness consent/audit and evidence assessment history", () => {
    expect(releaseMigration).toContain("create or replace function public.save_readiness_profile");
    expect(releaseMigration).toContain("perform public.replace_readiness_profile");
    expect(releaseMigration).toContain("insert into public.consent_records");
    expect(releaseMigration).toContain("insert into public.audit_events");
    expect(releaseMigration).toContain("create or replace function public.save_evidence_requirement_link");
    expect(releaseMigration).toContain("insert into public.assessment_versions");
    expect(releaseMigration).toContain("to service_role;");
    expect(releaseMigration).not.toMatch(/grant\s+execute[\s\S]*?\bto\s+(?:anon|authenticated)\b/i);
  });

  it("marks destructive environments in a service-only table and prevents active portfolio duplicates", () => {
    expect(releaseMigration).toContain("create table if not exists public.environment_sentinels");
    expect(releaseMigration).toContain("revoke all privileges on table public.environment_sentinels from public, anon, authenticated;");
    expect(releaseMigration).toContain("portfolio_one_active_catalogue_item");
    expect(releaseMigration).toContain("portfolio_one_active_external_item");
  });

  it("reasserts least privilege for deployed projects and closes future defaults", () => {
    expect(hardeningMigration).toContain("revoke all privileges on all tables in schema public from anon, authenticated;");
    expect(hardeningMigration).toContain("revoke execute on functions from public, anon, authenticated;");
    expect(hardeningMigration).toContain("grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;");
    expect(hardeningMigration).toContain("grant execute on function public.replace_weekly_plan(uuid, text, jsonb) to service_role;");
    expect(hardeningMigration).not.toMatch(/grant\s+execute[\s\S]*?\bto\s+(?:anon|authenticated)\b/i);
    expect(hardeningMigration).toContain("alter function public.consume_rate_limit(text, integer, integer) set search_path = '';");
    expect(hardeningMigration).toContain("alter function public.replace_weekly_plan(uuid, text, jsonb) set search_path = '';");
  });

  it("keeps the forward-only deployed-history repair as supplementary coverage", () => {
    expect(reassertionMigration).toContain("revoke all privileges on all tables in schema public from anon, authenticated;");
    expect(reassertionMigration).toContain("alter table public.checkout_reservations enable row level security;");
    expect(reassertionMigration).toContain("alter function public.apply_stripe_payment_event");
    expect(reassertionMigration).toContain("create trigger portfolio_item_security");
    expect(reassertionMigration).toContain("create trigger source_issue_security");
  });

  it("requires published parent records for public catalogue reads", () => {
    expect(migration).toContain('create policy "published requirements of published opportunities are public"');
    expect(migration).toMatch(
      /requirements\.opportunity_id[\s\S]*opportunities\.publication_state = 'published'/,
    );
    expect(migration).toContain('create policy "published organisations are public"');
    expect(migration).toMatch(
      /opportunities\.organisation_id = organisations\.id[\s\S]*opportunities\.publication_state = 'published'/,
    );
  });

  it("does not grant public access to raw catalogue snapshots", () => {
    const opportunityGrant = migration.match(
      /grant select \(([\s\S]*?)\) on public\.opportunities to anon, authenticated;/,
    );

    expect(opportunityGrant?.[1]).toBeDefined();
    expect(opportunityGrant?.[1]).not.toContain("raw_snapshot");
    expect(publicCatalogue).not.toContain("raw_snapshot");
    expect(publicCatalogue).not.toContain("source_id");
  });

  it("enforces ownership and relationship integrity below the API", () => {
    expect(migration).toContain("foreign key (user_id, evidence_id)");
    expect(migration).toContain("foreign key (user_id, portfolio_item_id)");
    expect(migration).toContain("relationship_invalid:saved_published_requirement_required");
    expect(migration).toContain("relationship_invalid:task_requirement_mismatch");
    expect(migration).toContain("relationship_invalid:plan_refresh_tasks");
    expect(migration).toContain("relationship_invalid:published_source_issue_required");
  });

  it("enforces entitlement and workflow limits under database locks", () => {
    expect(migration).toContain("pg_catalog.pg_advisory_xact_lock");
    expect(migration).toContain("entitlement_limit:active_opportunities");
    expect(migration).toContain("entitlement_limit:evidence_items");
    expect(migration).toContain("entitlement_limit:active_applications");
    expect(migration).toContain("entitlement_limit:weekly_refreshes");
    expect(migration).toContain("workflow_limit:this_week_tasks");
  });

  it("does not use the authenticated Supabase client for API mutations", () => {
    const unsafeMutation = /context\.supabase\s*\.from\([^)]*\)[\s\S]{0,250}?\.(insert|upsert|update|delete)\s*\(/;
    const offenders = routeFiles("src/app/api").filter((path) =>
      unsafeMutation.test(readFileSync(path, "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("accepts only the browser analytics event the current client emits", () => {
    expect(analyticsSchema.safeParse({ eventName: "readiness_started", properties: {} }).success).toBe(true);
    expect(analyticsSchema.safeParse({ eventName: "checkout_completed", properties: {} }).success).toBe(false);
    expect(
      analyticsSchema.safeParse({
        eventName: "readiness_started",
        properties: { application_cycle: 2027 },
      }).success,
    ).toBe(false);
  });

  it("does not accept client-selected consent policy versions", () => {
    expect(profileSchema.shape.policyVersion.safeParse(privacyTermsVersion).success).toBe(true);
    expect(profileSchema.shape.policyVersion.safeParse("forged-version").success).toBe(false);
  });
});
