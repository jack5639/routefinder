import { NextResponse } from "next/server";
import { apiError, getApiContext } from "@/lib/api-context";
import { evaluateCatalogueReadiness } from "@/lib/catalog/commercial/readiness";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

export async function GET() {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const admin = createAdminClient();
  const [opportunities, runs] = await Promise.all([
    admin.from("opportunities").select(`
      id,kind,sector,title,provider_name,location,application_url,source_url,source_authority,source_id,
      source_approval_reference,attribution,deadline,verified_at,freshness,freshness_expires_at,state,
      publication_state,latest_source_change_at,
      requirements(id,publication_state,supporting_text,source_url,verified_at,freshness,freshness_expires_at,conflict,hard_requirement,structured_value),
      catalogue_fact_revisions(id,status,created_at),
      source_issues(id,status,issue_kind)
    `),
    admin.from("source_runs").select("id,source_authority,status,started_at,completed_at,complete_snapshot,retrieved_count,records_changed").order("started_at", { ascending: false }).limit(100),
  ]);
  if (opportunities.error || runs.error) return apiError("Catalogue readiness is unavailable.", 503, "unavailable");
  return NextResponse.json(evaluateCatalogueReadiness(opportunities.data ?? [], runs.data ?? []));
}
