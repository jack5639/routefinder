import { describe, expect, it } from "vitest";

import { canImportUnapprovedStagingDrafts } from "./staging-draft-import";

const acknowledgement = "routefinder-staging-unapproved-drafts-v1";

describe("unapproved staging catalogue drafts", () => {
  it("permits draft-only imports only with the exact acknowledgement outside production", () => {
    expect(canImportUnapprovedStagingDrafts({
      CATALOGUE_UNAPPROVED_DRAFT_IMPORT_ACK: acknowledgement,
      NEXT_PUBLIC_SUPABASE_URL: "https://staging-ref.supabase.co",
      SUPABASE_PRODUCTION_PROJECT_REF: "production-ref",
    })).toBe(true);
  });

  it("fails closed for production, a missing production identity, or a mistyped acknowledgement", () => {
    expect(canImportUnapprovedStagingDrafts({
      CATALOGUE_UNAPPROVED_DRAFT_IMPORT_ACK: acknowledgement,
      NEXT_PUBLIC_SUPABASE_URL: "https://production-ref.supabase.co",
      SUPABASE_PRODUCTION_PROJECT_REF: "production-ref",
    })).toBe(false);
    expect(canImportUnapprovedStagingDrafts({
      CATALOGUE_UNAPPROVED_DRAFT_IMPORT_ACK: acknowledgement,
      NEXT_PUBLIC_SUPABASE_URL: "https://staging-ref.supabase.co",
    })).toBe(false);
    expect(canImportUnapprovedStagingDrafts({
      CATALOGUE_UNAPPROVED_DRAFT_IMPORT_ACK: "yes",
      NEXT_PUBLIC_SUPABASE_URL: "https://staging-ref.supabase.co",
      SUPABASE_PRODUCTION_PROJECT_REF: "production-ref",
    })).toBe(false);
  });
});
