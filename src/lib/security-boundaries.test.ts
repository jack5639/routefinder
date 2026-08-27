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
const cataloguePublicSafetyMigration = readFileSync("supabase/migrations/20260812130000_catalogue_public_safety.sql", "utf8");
const paymentRepairMigration = readFileSync("supabase/migrations/20260812120000_repair_stripe_entitlement_projection.sql", "utf8");
const launchSafetyMigration = readFileSync("supabase/migrations/20260827202316_launch_readiness_and_2027_safety.sql", "utf8");
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
    expect(migration).not.toContain("pg_catalog.least(");
    expect(migration).toContain("when public.rate_limit_buckets.count + 1 > maximum + 1 then maximum + 1");
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

  it("keeps Stripe entitlement projection aligned with the TypeScript ordering policy", () => {
    expect(paymentRepairMigration).toContain("last_payment_event_type = 'checkout.session.completed'");
    expect(paymentRepairMigration).toContain("'payment_review'");
    expect(paymentRepairMigration).toContain("next_entitlement_status := 'disputed'");
    expect(paymentRepairMigration).not.toContain("p_event_id > coalesce");
    expect(paymentRepairMigration).not.toMatch(/p_dispute_status\s*=\s*'won'[\s\S]*?status\s*:=\s*'active'/);
    expect(paymentRepairMigration).toContain("last_payment_event_type = p_event_type");
  });

  it("enforces the launch cycle, snapshot continuity, and deterministic grade boundary below the API", () => {
    expect(launchSafetyMigration).toContain("application_cycle is null or application_cycle = 2027");
    expect(launchSafetyMigration).toContain("p_application_cycle <> 2027");
    expect(launchSafetyMigration).toContain("opportunity_snapshot jsonb");
    expect(launchSafetyMigration).toContain("relationship_invalid:deterministic_grade_evidence_forbidden");
    expect(launchSafetyMigration).toContain("grant execute on function public.routefinder_release_probe() to service_role");
    expect(launchSafetyMigration).not.toMatch(/grant execute on function public\.routefinder_release_probe\(\) to (?:anon|authenticated)/);
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

  it("keeps public catalogue reads behind the current safety predicate", () => {
    expect(cataloguePublicSafetyMigration).toContain("create or replace function public.catalogue_public_opportunity_current");
    expect(cataloguePublicSafetyMigration).toContain("o.state = 'open'");
    expect(cataloguePublicSafetyMigration).toContain("o.deadline > pg_catalog.now()");
    expect(cataloguePublicSafetyMigration).toContain("o.application_cycle = 2027");
    expect(cataloguePublicSafetyMigration).toContain("s.complete_snapshot");
    expect(cataloguePublicSafetyMigration).toContain("q.hard_requirement and not public.catalogue_rule_supported");
    expect(cataloguePublicSafetyMigration).toContain('create policy "current published opportunities are public"');
    expect(cataloguePublicSafetyMigration).toMatch(/revoke all on function public\.verify_catalogue_opportunity_cycle\([\s\S]*?\) from public, anon, authenticated/);
    expect(cataloguePublicSafetyMigration).toMatch(/grant execute on function public\.verify_catalogue_opportunity_cycle\([\s\S]*?\) to service_role/);
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

  it("covers every state-changing route with same-origin or caller authentication", () => {
    const guardedBrowserRoutes = [
      "src/app/api/account/delete/route.ts",
      "src/app/api/account/import-prototype/route.ts",
      "src/app/api/account/export/route.ts",
      "src/app/api/analytics/route.ts",
      "src/app/api/funnel/route.ts",
      "src/app/api/applications/route.ts",
      "src/app/api/applications/[id]/route.ts",
      "src/app/api/checkout/route.ts",
      "src/app/api/evidence/route.ts",
      "src/app/api/evidence/[id]/route.ts",
      "src/app/api/evidence-links/route.ts",
      "src/app/api/evidence-links/[id]/route.ts",
      "src/app/api/portfolio/route.ts",
      "src/app/api/portfolio/[id]/route.ts",
      "src/app/api/profile/route.ts",
      "src/app/api/source-issues/route.ts",
      "src/app/api/tasks/route.ts",
      "src/app/api/tasks/[id]/route.ts",
      "src/app/api/tasks/refresh/route.ts",
      "src/app/api/auth/magic-link/route.ts",
      "src/app/api/recommendations/route.ts",
      "src/app/api/roadmaps/generate/route.ts",
      "src/app/auth/signout/route.ts",
      "src/app/api/admin/catalogue/route.ts",
      "src/app/api/admin/catalogue/facts/route.ts",
      "src/app/api/admin/catalogue/review/route.ts",
      "src/app/api/admin/catalogue/sources/route.ts",
      "src/app/api/admin/catalogue/sync/route.ts",
    ];
    for (const path of guardedBrowserRoutes) {
      expect(readFileSync(path, "utf8"), path).toMatch(/getMutationApiContext\(request\)|isSameOriginRequest\(request\)/);
    }

    expect(readFileSync("src/app/api/stripe/webhook/route.ts", "utf8")).toContain('request.headers.get("stripe-signature")');
    for (const path of ["src/app/api/cron/catalogue/route.ts", "src/app/api/cron/expiry/route.ts"]) {
      expect(readFileSync(path, "utf8"), path).toContain('request.headers.get("authorization")');
    }

    const authCallback = readFileSync("src/app/auth/callback/route.ts", "utf8");
    expect(authCallback).toContain("exchangeCodeForSession(code)");
    expect(authCallback).toContain("emailOtpTypes.has(type)");
    expect(authCallback).toContain("normalisePostLoginPath");
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

  it("accepts only the supported 2027 launch cycle in profile input", () => {
    const base = {
      currentStage: "Year 13", applicationCycle: 2027, homeRegion: "London", maxTravelMinutes: 60,
      relocationPreference: "unsure", routeIntent: "combined", sectors: ["technology"], workStyles: [],
      financialPreference: "open", constraints: [], qualifications: [], qualificationsComplete: false,
      policyVersion: privacyTermsVersion,
    };
    expect(profileSchema.safeParse(base).success).toBe(true);
    expect(profileSchema.safeParse({ ...base, applicationCycle: 2028 }).success).toBe(false);
  });
});
