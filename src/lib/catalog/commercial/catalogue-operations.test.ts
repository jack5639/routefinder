import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202607300005_catalogue_publication_operations.sql", "utf8");
const organisationMigration = readFileSync("supabase/migrations/20260801222228_align_catalogue_organisation.sql", "utf8");
const indexMigration = readFileSync("supabase/migrations/20260801223008_index_catalogue_review_foreign_keys.sql", "utf8");
const attestationMigration = readFileSync("supabase/migrations/20260801225211_catalogue_source_attestations.sql", "utf8");
const attestationIndexMigration = readFileSync("supabase/migrations/20260801230116_index_catalogue_source_attestation_reviewers.sql", "utf8");
const publicSafetyMigration = readFileSync("supabase/migrations/20260812130000_catalogue_public_safety.sql", "utf8");

describe("catalogue database operations", () => {
  it("keeps source-backed provider names aligned with organisation ownership", () => {
    expect(organisationMigration).toContain("align_catalogue_opportunity_organisation");
    expect(organisationMigration).toContain("new.organisation_id := target_organisation_id");
    expect(organisationMigration).toMatch(/new\.source_authority not in \('discover-uni-hesa', 'find-an-apprenticeship-api-v2'\)/);
    expect(organisationMigration).toMatch(/revoke all on function public\.align_catalogue_opportunity_organisation\(\) from public, anon, authenticated/);
  });

  it("indexes the catalogue review and audit foreign keys used by the admin workflow", () => {
    for (const index of [
      "opportunities_organisation_idx",
      "opportunities_closure_source_run_idx",
      "catalogue_fact_revisions_observation_idx",
      "catalogue_fact_revisions_reviewer_idx",
      "catalogue_manual_revisions_opportunity_idx",
      "catalogue_manual_revisions_requirement_idx",
      "catalogue_manual_revisions_reviewer_idx",
      "publication_reviews_opportunity_idx",
      "publication_reviews_requirement_idx",
      "publication_reviews_reviewer_idx",
      "source_issues_user_idx",
    ]) expect(indexMigration).toContain(index);
  });

  it("keeps publication and review functions service-role only", () => {
    for (const name of [
      "begin_catalogue_source_run",
      "ingest_catalogue_observation_batch",
      "finish_catalogue_source_run",
      "review_catalogue_revision",
      "review_catalogue_publication",
      "review_catalogue_fact_mutation",
      "maintain_catalogue_operations",
      "create_catalogue_manual_draft",
      "catalogue_review_queue",
      "resolve_catalogue_source_issue",
    ]) {
      expect(migration).toContain(`revoke all on function public.${name}`);
      expect(migration).toContain(`grant execute on function public.${name}`);
    }
    expect(migration).not.toMatch(/grant execute on function public\.(?:begin_catalogue|ingest_catalogue|finish_catalogue|review_catalogue|maintain_catalogue)[\s\S]*?\bto (?:anon|authenticated)\b/);
  });

  it("uses an auditable source permission attestation instead of a written reference", () => {
    expect(attestationMigration).toContain("create table public.catalogue_source_attestations");
    expect(attestationMigration).toContain("catalogue_one_active_source_attestation");
    expect(attestationMigration).toContain("create or replace function public.attest_catalogue_source");
    expect(attestationMigration).toContain("publication_source_unattested");
    expect(attestationMigration).not.toContain("publication_source_unapproved");
    expect(attestationMigration).toMatch(/revoke all on function public\.attest_catalogue_source\(text,uuid,text,text\) from public, anon, authenticated/);
    expect(attestationMigration).toMatch(/grant execute on function public\.attest_catalogue_source\(text,uuid,text,text\) to service_role/);
    expect(attestationIndexMigration).toContain("catalogue_source_attestations_attested_by_idx");
    expect(attestationIndexMigration).toContain("catalogue_source_attestations_revoked_by_idx");
  });

  it("recovers abandoned runs and protects overlap and closure", () => {
    expect(migration).toContain("error_code = 'stale-running-run'");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("p_status <> 'completed' or not p_complete_snapshot");
    expect(migration).toContain("p_close_missing and source_name = 'find-an-apprenticeship-api-v2'");
  });

  it("deduplicates pending revisions and issues while preserving reviewed facts", () => {
    expect(migration).toContain("catalogue_one_pending_revision");
    expect(migration).toContain("status = 'superseded'");
    expect(migration).toContain("catalogue_one_active_issue_fingerprint");
    expect(migration).toMatch(/if existing\.publication_state = 'published'[\s\S]*insert into public\.catalogue_fact_revisions/);
  });

  it("fails publication for every material database gate", () => {
    for (const code of [
      "publication_sector_invalid", "publication_not_open", "publication_fact_missing",
      "publication_verification_expired", "publication_deadline_passed",
      "publication_attribution_missing", "publication_revision_pending", "publication_source_issue_open",
      "publication_requirement_missing", "publication_requirement_invalid",
    ]) expect(migration).toContain(code);
    expect(migration).toContain("catalogue_rule_supported");
    expect(migration).toContain("insert into public.publication_reviews");
  });

  it("implements server-side review filters, pagination and launch-coverage sorting", () => {
    expect(migration).toContain("create or replace function public.catalogue_review_queue");
    expect(migration).toContain("p_missing_requirements");
    expect(migration).toContain("p_pending_revision");
    expect(migration).toContain("p_launch_failure");
    expect(migration).toContain("p_sort='coverage-shortfall'");
    expect(migration).toContain("limit greatest(10,least(p_page_size,50))");
  });

  it("keeps public reads behind current deadline, freshness, source, requirement and cycle gates", () => {
    expect(publicSafetyMigration).toContain("PostgreSQL 42702");
    expect(publicSafetyMigration).toContain("where r.opportunity_id = existing.id and r.status = 'pending'");
    expect(publicSafetyMigration).toContain("create or replace function public.catalogue_public_opportunity_current");
    expect(publicSafetyMigration).toContain("o.deadline > pg_catalog.now()");
    expect(publicSafetyMigration).toContain("o.application_cycle = 2027");
    expect(publicSafetyMigration).toContain("s.complete_snapshot");
    expect(publicSafetyMigration).toContain("q.hard_requirement and not public.catalogue_rule_supported");
    expect(publicSafetyMigration).toContain('create policy "current published opportunities are public"');
  });

  it("closes passed-deadline records during scheduled catalogue maintenance", () => {
    expect(publicSafetyMigration).toContain("closedExpiredDeadlines");
    expect(publicSafetyMigration).toMatch(/update public\.opportunities set state = 'closed'[\s\S]*deadline is not null and deadline <= pg_catalog\.now\(\)/);
    expect(publicSafetyMigration).toContain("verify_catalogue_opportunity_cycle");
  });
});
