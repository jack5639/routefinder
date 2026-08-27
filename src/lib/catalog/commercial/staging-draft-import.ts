const UNAPPROVED_STAGING_DRAFT_ACK = "routefinder-staging-unapproved-drafts-v1";
type StagingDraftEnvironment = Partial<Record<
  "CATALOGUE_UNAPPROVED_DRAFT_IMPORT_ACK" | "SUPABASE_PRODUCTION_PROJECT_REF" | "NEXT_PUBLIC_SUPABASE_URL",
  string
>>;

/**
 * Allows source observations to be stored as unpublished staging drafts while
 * a source permission attestation is pending. Publication still fails closed in
 * Postgres without that attestation, so these records cannot become
 * public or satisfy launch readiness.
 */
export function canImportUnapprovedStagingDrafts(
  environment: StagingDraftEnvironment = process.env as unknown as StagingDraftEnvironment,
) {
  if (environment.CATALOGUE_UNAPPROVED_DRAFT_IMPORT_ACK !== UNAPPROVED_STAGING_DRAFT_ACK) return false;
  if (!environment.SUPABASE_PRODUCTION_PROJECT_REF) return false;
  try {
    const currentProjectRef = new URL(environment.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname.split(".")[0];
    return Boolean(currentProjectRef) && currentProjectRef !== environment.SUPABASE_PRODUCTION_PROJECT_REF;
  } catch {
    return false;
  }
}
