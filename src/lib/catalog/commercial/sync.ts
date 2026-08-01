import "server-only";

import { fetchApprenticeshipDrafts, type ApprenticeshipDraft } from "@/lib/catalog/commercial/find-apprenticeship";
import { fetchDiscoverUniDataset, type DiscoverUniCourseDraft, type DiscoverUniSnapshot } from "@/lib/catalog/commercial/discover-uni";
import { freshnessExpiry, hashSnapshot } from "@/lib/catalog/commercial/revisions";
import { logServerEvent } from "@/lib/logging";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
type Imported = (ApprenticeshipDraft | (DiscoverUniCourseDraft & { summary: string; sourceUrl: string; retrievedAt: string; rawSnapshot: unknown }))
  & { kind: "apprenticeship-vacancy" | "university-course"; sourceAuthority: "find-an-apprenticeship-api-v2" | "discover-uni-hesa" };
const BATCH_SIZE = 100;

const approvalFor = (source: string) => source === "find-an-apprenticeship-api-v2"
  ? process.env.APPRENTICESHIP_SOURCE_APPROVAL_REFERENCE
  : process.env.DISCOVER_UNI_SOURCE_APPROVAL_REFERENCE;

async function alert(event: string, detail: Record<string, unknown>) {
  logServerEvent("error", event, detail);
  const url = process.env.CATALOGUE_ALERT_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, ...detail }) }); } catch { /* logging is the reliable fallback */ }
}

function normalizedFact(draft: Imported) {
  return {
    kind: draft.kind,
    sector: draft.sector,
    title: draft.title,
    provider_name: draft.providerName,
    location: draft.location,
    summary: draft.summary,
    deadline: "deadline" in draft ? draft.deadline ?? null : null,
    application_url: draft.applicationUrl,
    source_url: draft.sourceUrl,
    state: draft.kind === "university-course" ? "unknown" : "open",
  };
}

async function ingestBatches(admin: Admin, runId: string, drafts: Imported[], sourceUrl: string, approvalReference: string, snapshot?: DiscoverUniSnapshot) {
  let changed = 0;
  let created = 0;
  for (let offset = 0; offset < drafts.length; offset += BATCH_SIZE) {
    const items = drafts.slice(offset, offset + BATCH_SIZE).map((draft) => ({
      sourceId: draft.sourceId,
      sourceUrl: draft.sourceUrl,
      retrievedAt: draft.retrievedAt,
      freshnessExpiresAt: freshnessExpiry(draft.retrievedAt, draft.kind === "university-course" ? 8 : 2),
      snapshotHash: hashSnapshot(draft.rawSnapshot),
      normalizedFact: normalizedFact(draft),
      rawFact: draft.rawSnapshot,
      classificationReason: draft.classificationReason,
      classificationVersion: "v1",
      ...(snapshot ? { attribution: { credit: snapshot.attribution, licence: "https://creativecommons.org/licenses/by/4.0/", changes: "Routefinder selected and transformed launch-scope course fields from the Discover Uni dataset." } } : {}),
    }));
    const result = await admin.rpc("ingest_catalogue_observation_batch", {
      p_source_run_id: runId,
      p_source_authority: drafts[offset].sourceAuthority,
      p_source_url: sourceUrl,
      p_source_approval_reference: approvalReference,
      p_items: items,
    });
    if (result.error) throw new Error("catalogue-batch-ingest-failed");
    const summary = result.data as { changed?: number; created?: number } | null;
    changed += summary?.changed ?? 0;
    created += summary?.created ?? 0;
  }
  return { changed, created };
}

async function beginRun(admin: Admin, sourceAuthority: string, sourceUrl: string) {
  const result = await admin.rpc("begin_catalogue_source_run", {
    p_source_authority: sourceAuthority,
    p_source_url: sourceUrl,
    p_stale_after_minutes: 90,
  });
  if (result.error || !result.data) throw new Error(result.error?.message.includes("already_active") ? "catalogue-run-already-active" : "catalogue-run-create");
  return String(result.data);
}

async function finishRun(admin: Admin, runId: string, values: {
  status: "completed" | "failed"; complete: boolean; retrieved: number; changed: number;
  snapshotHash?: string; metadata?: Record<string, unknown>; errorCode?: string; closeMissing?: boolean;
}) {
  const result = await admin.rpc("finish_catalogue_source_run", {
    p_source_run_id: runId,
    p_status: values.status,
    p_complete_snapshot: values.complete,
    p_retrieved_count: values.retrieved,
    p_records_changed: values.changed,
    p_snapshot_hash: values.snapshotHash,
    p_metadata: values.metadata ?? {},
    p_error_code: values.errorCode,
    p_close_missing: values.closeMissing ?? false,
  });
  if (result.error) throw new Error("catalogue-run-finish-failed");
}

async function alertBacklog(admin: Admin, source: string, runId: string, changed: number) {
  const [revisions, issues] = await Promise.all([
    admin.from("catalogue_fact_revisions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("source_issues").select("id", { count: "exact", head: true }).neq("status", "resolved"),
  ]);
  if (changed > 100) await alert("catalogue.unusual_change_volume", { source, runId, changed });
  if ((revisions.count ?? 0) > 50 || (issues.count ?? 0) > 50) await alert("catalogue.review_backlog", { source, runId, pendingRevisions: revisions.count ?? 0, unresolvedIssues: issues.count ?? 0 });
}

export async function syncApprenticeships() {
  const key = process.env.APPRENTICESHIP_API_KEY;
  if (!key) throw new Error("APPRENTICESHIP_API_KEY is not configured.");
  if (!approvalFor("find-an-apprenticeship-api-v2")) throw new Error("APPRENTICESHIP_SOURCE_APPROVAL_REFERENCE is required before commercial sync.");
  const admin = createAdminClient(); const sourceUrl = "https://api.apprenticeships.education.gov.uk/vacancies";
  const runId = await beginRun(admin, "find-an-apprenticeship-api-v2", sourceUrl);
  let retrieved = 0;
  let changed = 0;
  try {
    const result = await fetchApprenticeshipDrafts(key);
    const drafts: Imported[] = result.drafts.map((draft) => ({ ...draft, kind: "apprenticeship-vacancy", sourceAuthority: "find-an-apprenticeship-api-v2" }));
    retrieved = drafts.length;
    ({ changed } = await ingestBatches(admin, runId, drafts, sourceUrl, approvalFor("find-an-apprenticeship-api-v2")!));
    await finishRun(admin, runId, { status: "completed", complete: result.complete, retrieved, changed, snapshotHash: hashSnapshot(drafts.map((draft) => draft.rawSnapshot)), closeMissing: result.complete });
    if (!result.complete) await alert("catalogue.sync_incomplete", { source: "apprenticeships", runId, retrieved });
    await alertBacklog(admin, "apprenticeships", runId, changed);
    return { drafted: drafts.length, changed, complete: result.complete };
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "unknown";
    try { await finishRun(admin, runId, { status: "failed", complete: false, retrieved, changed, errorCode: code }); } catch { /* the original bounded failure remains authoritative */ }
    await alert("catalogue.sync_failed", { source: "apprenticeships", runId, errorCode: code }); throw error;
  }
}

export async function syncDiscoverUni() {
  const sourceUrl = process.env.DISCOVER_UNI_DATASET_URL;
  if (!sourceUrl) throw new Error("DISCOVER_UNI_DATASET_URL is not configured.");
  const approval = approvalFor("discover-uni-hesa");
  if (!approval) throw new Error("DISCOVER_UNI_SOURCE_APPROVAL_REFERENCE is required before commercial sync.");
  const admin = createAdminClient();
  const runId = await beginRun(admin, "discover-uni-hesa", sourceUrl);
  let retrieved = 0;
  let changed = 0;
  try {
    const dataset = await fetchDiscoverUniDataset(sourceUrl);
    const drafts: Imported[] = dataset.courses.map((course) => ({
      ...course,
      kind: "university-course",
      sourceAuthority: "discover-uni-hesa",
      summary: "Discover Uni candidate. Verify the provider’s primary course page and every requirement before publishing.",
      sourceUrl: course.applicationUrl,
      retrievedAt: dataset.snapshot.retrievedAt,
    }));
    retrieved = drafts.length;
    ({ changed } = await ingestBatches(admin, runId, drafts, sourceUrl, approval, dataset.snapshot));
    await finishRun(admin, runId, { status: "completed", complete: true, retrieved, changed, snapshotHash: dataset.snapshot.sha256, metadata: dataset.snapshot as unknown as Record<string, unknown>, closeMissing: false });
    await alertBacklog(admin, "discover-uni", runId, changed);
    return { drafted: drafts.length, changed, complete: true, snapshot: dataset.snapshot };
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "unknown";
    try { await finishRun(admin, runId, { status: "failed", complete: false, retrieved, changed, errorCode: code }); } catch { /* the original bounded failure remains authoritative */ }
    await alert("catalogue.sync_failed", { source: "discover-uni", runId, errorCode: code }); throw error;
  }
}

export async function maintainCommercialCatalogue() {
  const admin = createAdminClient();
  const result = await admin.rpc("maintain_catalogue_operations");
  if (result.error) {
    await alert("catalogue.maintenance_failed", { errorCode: "catalogue-maintenance-failed" });
    throw new Error("catalogue-maintenance-failed");
  }
  const counts = result.data as {
    staleRunsRecovered?: number; expiredOpportunities?: number; expiredRequirements?: number; oldPendingRevisions?: number;
    staleSources?: string[];
  };
  if ((counts.staleRunsRecovered ?? 0) > 0) await alert("catalogue.stale_runs_recovered", { count: counts.staleRunsRecovered });
  if ((counts.oldPendingRevisions ?? 0) > 0) await alert("catalogue.pending_revision_age", { count: counts.oldPendingRevisions });
  if ((counts.staleSources ?? []).length > 0) await alert("catalogue.source_stale", { sources: counts.staleSources });
  if ((counts.expiredOpportunities ?? 0) + (counts.expiredRequirements ?? 0) > 0) {
    await alert("catalogue.freshness_expired", { opportunities: counts.expiredOpportunities ?? 0, requirements: counts.expiredRequirements ?? 0 });
  }
  return counts;
}
