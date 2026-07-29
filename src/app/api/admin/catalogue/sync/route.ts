import { NextResponse } from "next/server";

import { apiError, getApiContext } from "@/lib/api-context";
import { fetchApprenticeshipDrafts } from "@/lib/catalog/commercial/find-apprenticeship";
import { fetchDiscoverUniDataset } from "@/lib/catalog/commercial/discover-uni";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const source = new URL(request.url).searchParams.get("source");
  const admin = createAdminClient();

  if (source === "apprenticeships") {
    const apiKey = process.env.APPRENTICESHIP_API_KEY;
    if (!apiKey) return apiError("APPRENTICESHIP_API_KEY is not configured.", 503, "configuration-required");
    const sourceUrl = "https://api.apprenticeships.education.gov.uk/vacancies";
    const { data: run } = await admin.from("source_runs").insert({ source_authority: "find-an-apprenticeship-api-v2", status: "running", source_url: sourceUrl }).select("id").single();
    try {
      const drafts = await fetchApprenticeshipDrafts(apiKey);
      if (drafts.length) {
        const organisationRows = [...new Set(drafts.map((draft) => draft.providerName))].map((name) => ({
          kind: "employer",
          name,
          source_authority: "find-an-apprenticeship-api-v2",
          updated_at: new Date().toISOString(),
        }));
        const { data: organisations, error: organisationError } = await admin
          .from("organisations")
          .upsert(organisationRows, { onConflict: "kind,name" })
          .select("id,name");
        if (organisationError) throw new Error("apprenticeship-organisation-upsert");
        const organisationByName = new Map((organisations ?? []).map((organisation) => [organisation.name, organisation.id]));
        const { error: opportunityError } = await admin.from("opportunities").upsert(
          drafts.map((draft) => ({
            organisation_id: organisationByName.get(draft.providerName),
            source_id: draft.sourceId,
            kind: "apprenticeship-vacancy",
            sector: draft.sector,
            title: draft.title,
            provider_name: draft.providerName,
            location: draft.location,
            summary: draft.summary,
            deadline: draft.deadline,
            application_url: draft.applicationUrl,
            source_url: draft.sourceUrl,
            source_authority: "find-an-apprenticeship-api-v2",
            retrieved_at: draft.retrievedAt,
            freshness: "needs-checking",
            state: "open",
            publication_state: "draft",
            raw_snapshot: draft.rawSnapshot,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "source_authority,source_id" },
        );
        if (opportunityError) throw new Error("apprenticeship-opportunity-upsert");
      }
      if (run) await admin.from("source_runs").update({ status: "completed", completed_at: new Date().toISOString(), retrieved_count: drafts.length }).eq("id", run.id);
      return NextResponse.json({ source, drafted: drafts.length });
    } catch (error) {
      if (run) await admin.from("source_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_code: error instanceof Error ? error.message.slice(0, 80) : "unknown" }).eq("id", run.id);
      return apiError("The official apprenticeship sync failed.", 502, "source-error");
    }
  }

  if (source === "discover-uni") {
    const sourceUrl = process.env.DISCOVER_UNI_DATASET_URL;
    if (!sourceUrl) return apiError("DISCOVER_UNI_DATASET_URL is not configured.", 503, "configuration-required");
    const { data: run } = await admin.from("source_runs").insert({
      source_authority: "discover-uni-hesa",
      status: "running",
      source_url: sourceUrl,
    }).select("id").single();
    try {
      const dataset = await fetchDiscoverUniDataset(sourceUrl);
      const providerNames = [...new Set(dataset.courses.map((course) => course.providerName))];
      const { data: organisations, error: organisationError } = providerNames.length
        ? await admin.from("organisations").upsert(
            providerNames.map((name) => ({
              kind: "university-provider",
              name,
              source_authority: "discover-uni-hesa",
              updated_at: new Date().toISOString(),
            })),
            { onConflict: "kind,name" },
          ).select("id,name")
        : { data: [], error: null };
      if (organisationError) throw new Error("discover-uni-organisation-upsert");
      const organisationByName = new Map((organisations ?? []).map((organisation) => [organisation.name, organisation.id]));
      for (let index = 0; index < dataset.courses.length; index += 500) {
        const batch = dataset.courses.slice(index, index + 500);
        const { error: opportunityError } = await admin.from("opportunities").upsert(
          batch.map((course) => ({
            organisation_id: organisationByName.get(course.providerName),
            source_id: course.sourceId,
            kind: "university-course",
            sector: course.sector,
            title: course.title,
            provider_name: course.providerName,
            location: course.location,
            summary: "Course record from the Discover Uni dataset. Provider-specific entry requirements require manual review.",
            application_url: course.applicationUrl,
            source_url: course.applicationUrl,
            source_authority: "discover-uni-hesa",
            retrieved_at: dataset.snapshot.retrievedAt,
            freshness: "needs-checking",
            state: "unknown",
            publication_state: "draft",
            raw_snapshot: { ...course.rawSnapshot, attribution: dataset.snapshot.attribution, licence: dataset.snapshot.licence },
            updated_at: new Date().toISOString(),
          })),
          { onConflict: "source_authority,source_id" },
        );
        if (opportunityError) throw new Error("discover-uni-opportunity-upsert");
      }
      if (run) await admin.from("source_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        retrieved_count: dataset.courses.length,
        snapshot_hash: dataset.snapshot.sha256,
        metadata: dataset.snapshot,
      }).eq("id", run.id);
      return NextResponse.json({ source, snapshot: dataset.snapshot, drafted: dataset.courses.length });
    } catch (error) {
      if (run) await admin.from("source_runs").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_code: error instanceof Error ? error.message.slice(0, 80) : "unknown",
      }).eq("id", run.id);
      return apiError("The Discover Uni dataset could not be verified.", 502, "source-error");
    }
  }

  return apiError("Choose apprenticeships or discover-uni.");
}
