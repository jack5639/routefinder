import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/202607300005_catalogue_publication_operations.sql", "utf8");

describe("catalogue database operations", () => {
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
      "publication_verification_expired", "publication_deadline_passed", "publication_source_unapproved",
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
});
