import "server-only";

import { fetchApprenticeshipDrafts, type ApprenticeshipDraft } from "@/lib/catalog/commercial/find-apprenticeship";
import { fetchDiscoverUniDataset } from "@/lib/catalog/commercial/discover-uni";
import { changedFields, freshnessExpiry, hasChanges, hashSnapshot } from "@/lib/catalog/commercial/revisions";
import { logServerEvent } from "@/lib/logging";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;
type Imported = ApprenticeshipDraft & { kind: "apprenticeship-vacancy"; sourceAuthority: "find-an-apprenticeship-api-v2" };

const approvalFor = (source: string) => source === "find-an-apprenticeship-api-v2"
  ? process.env.APPRENTICESHIP_SOURCE_APPROVAL_REFERENCE
  : process.env.DISCOVER_UNI_SOURCE_APPROVAL_REFERENCE;

async function alert(event: string, detail: Record<string, unknown>) {
  logServerEvent("error", event, detail);
  const url = process.env.CATALOGUE_ALERT_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, ...detail }) }); } catch { /* logging is the reliable fallback */ }
}

async function upsertImported(admin: Admin, runId: string, drafts: Imported[], sourceUrl: string, complete: boolean) {
  let changed = 0;
  const seen = new Set<string>();
  for (const draft of drafts) {
    seen.add(draft.sourceId);
    const now = draft.retrievedAt;
    const proposed = {
      source_id: draft.sourceId, kind: draft.kind, sector: draft.sector, title: draft.title,
      provider_name: draft.providerName, location: draft.location, summary: draft.summary,
      deadline: draft.deadline ?? null, application_url: draft.applicationUrl, source_url: draft.sourceUrl,
      state: "open",
    };
    const { data: existing } = await admin.from("opportunities").select("*").eq("source_authority", draft.sourceAuthority).eq("source_id", draft.sourceId).maybeSingle();
    if (!existing) {
      const { data: organisation } = await admin.from("organisations").upsert({ kind: "employer", name: draft.providerName, source_authority: draft.sourceAuthority, updated_at: now }, { onConflict: "kind,name" }).select("id").single();
      const { data: created, error } = await admin.from("opportunities").insert({ ...proposed, organisation_id: organisation?.id, source_authority: draft.sourceAuthority, retrieved_at: now, last_seen_at: now, freshness_expires_at: freshnessExpiry(now, 2), freshness: "needs-checking", publication_state: "draft", raw_snapshot: draft.rawSnapshot }).select("id").single();
      if (error) throw new Error("catalogue-opportunity-create");
      await admin.from("catalogue_observations").insert({ opportunity_id: created.id, source_run_id: runId, source_authority: draft.sourceAuthority, source_id: draft.sourceId, source_url: sourceUrl, retrieved_at: now, snapshot_hash: hashSnapshot(draft.rawSnapshot), normalized_fact: proposed, raw_fact: draft.rawSnapshot, classification_reason: draft.classificationReason, classification_version: "v1" });
      continue;
    }
    const changes = changedFields(existing as Record<string, unknown>, proposed);
    const observation = await admin.from("catalogue_observations").insert({ opportunity_id: existing.id, source_run_id: runId, source_authority: draft.sourceAuthority, source_id: draft.sourceId, source_url: sourceUrl, retrieved_at: now, snapshot_hash: hashSnapshot(draft.rawSnapshot), normalized_fact: proposed, raw_fact: draft.rawSnapshot, classification_reason: draft.classificationReason, classification_version: "v1" }).select("id").single();
    await admin.from("opportunities").update({ last_seen_at: now, retrieved_at: now, freshness_expires_at: freshnessExpiry(now, 2), raw_snapshot: draft.rawSnapshot, updated_at: now }).eq("id", existing.id);
    if (!hasChanges(changes)) continue;
    changed += 1;
    if (existing.publication_state === "published") {
      await admin.from("catalogue_fact_revisions").insert({ opportunity_id: existing.id, observation_id: observation.data?.id, field_changes: changes, proposed_fact: proposed });
      await admin.from("source_issues").insert({ opportunity_id: existing.id, issue_kind: "conflicting", detail: "Imported source facts changed and await review." });
    } else {
      await admin.from("opportunities").update({ ...proposed, freshness: "needs-checking", updated_at: now }).eq("id", existing.id);
    }
  }
  if (complete) {
    const { data: missing } = await admin.from("opportunities").select("id,source_id,publication_state").eq("source_authority", "find-an-apprenticeship-api-v2").neq("state", "closed");
    for (const opportunity of missing ?? []) if (opportunity.source_id && !seen.has(opportunity.source_id)) {
      await admin.from("opportunities").update({ state: "closed", freshness: "low", updated_at: new Date().toISOString() }).eq("id", opportunity.id);
      await admin.from("source_issues").insert({ opportunity_id: opportunity.id, issue_kind: "closed", detail: "Not present in a complete official source snapshot." });
    }
  }
  return changed;
}

export async function syncApprenticeships() {
  const key = process.env.APPRENTICESHIP_API_KEY;
  if (!key) throw new Error("APPRENTICESHIP_API_KEY is not configured.");
  if (!approvalFor("find-an-apprenticeship-api-v2")) throw new Error("APPRENTICESHIP_SOURCE_APPROVAL_REFERENCE is required before commercial sync.");
  const admin = createAdminClient(); const sourceUrl = "https://api.apprenticeships.education.gov.uk/vacancies";
  const { data: run, error } = await admin.from("source_runs").insert({ source_authority: "find-an-apprenticeship-api-v2", status: "running", source_url: sourceUrl }).select("id").single();
  if (error || !run) throw new Error("catalogue-run-already-active");
  try {
    const result = await fetchApprenticeshipDrafts(key);
    const drafts: Imported[] = result.drafts.map((draft) => ({ ...draft, kind: "apprenticeship-vacancy", sourceAuthority: "find-an-apprenticeship-api-v2" }));
    const changed = await upsertImported(admin, run.id, drafts, sourceUrl, result.complete);
    await admin.from("source_runs").update({ status: "completed", completed_at: new Date().toISOString(), retrieved_count: drafts.length, records_changed: changed, complete_snapshot: result.complete }).eq("id", run.id);
    return { drafted: drafts.length, changed, complete: result.complete };
  } catch (error) {
    await admin.from("source_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_code: error instanceof Error ? error.message.slice(0, 80) : "unknown" }).eq("id", run.id);
    await alert("catalogue.sync_failed", { source: "apprenticeships", runId: run.id }); throw error;
  }
}

export async function syncDiscoverUni() {
  const sourceUrl = process.env.DISCOVER_UNI_DATASET_URL;
  if (!sourceUrl) throw new Error("DISCOVER_UNI_DATASET_URL is not configured.");
  const admin = createAdminClient();
  const { data: run } = await admin.from("source_runs").insert({ source_authority: "discover-uni-hesa", status: "running", source_url: sourceUrl }).select("id").single();
  if (!run) throw new Error("catalogue-run-create");
  try {
    const dataset = await fetchDiscoverUniDataset(sourceUrl);
    for (const course of dataset.courses) await admin.from("opportunities").upsert({ source_id: course.sourceId, kind: "university-course", sector: course.sector, title: course.title, provider_name: course.providerName, location: course.location, summary: "Discover Uni candidate. Verify the official provider page and requirements before publishing.", application_url: course.applicationUrl, source_url: course.applicationUrl, source_authority: "discover-uni-hesa", retrieved_at: dataset.snapshot.retrievedAt, last_seen_at: dataset.snapshot.retrievedAt, freshness_expires_at: freshnessExpiry(dataset.snapshot.retrievedAt, 7), freshness: "needs-checking", state: "unknown", publication_state: "draft", raw_snapshot: { ...course.rawSnapshot, attribution: dataset.snapshot.attribution, licence: dataset.snapshot.licence }, updated_at: new Date().toISOString() }, { onConflict: "source_authority,source_id", ignoreDuplicates: true });
    await admin.from("source_runs").update({ status: "completed", completed_at: new Date().toISOString(), retrieved_count: dataset.courses.length, complete_snapshot: true, snapshot_hash: dataset.snapshot.sha256, metadata: dataset.snapshot }).eq("id", run.id);
    return { drafted: dataset.courses.length, snapshot: dataset.snapshot };
  } catch (error) { await admin.from("source_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_code: error instanceof Error ? error.message.slice(0, 80) : "unknown" }).eq("id", run.id); await alert("catalogue.sync_failed", { source: "discover-uni", runId: run.id }); throw error; }
}
