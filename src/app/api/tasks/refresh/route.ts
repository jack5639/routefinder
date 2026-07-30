import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { apiError, databaseErrorIs, getMutationApiContext } from "@/lib/api-context";
import { activePlan } from "@/lib/mvp/entitlements";
import { selectThisWeek, type TaskCandidate } from "@/lib/mvp/tasks";
import { assessOpportunityRequirements } from "@/lib/mvp/requirement-assessment";
import { candidatesForOpportunity } from "@/lib/mvp/weekly-candidates";
import type { Opportunity, Qualification, Requirement } from "@/lib/mvp/types";
import { publicOpportunityWithRequirements } from "@/lib/supabase/public-catalogue";

type Row = Record<string, unknown>;

function opportunityFromRow(row: Row): Opportunity {
  return {
    id: String(row.id), kind: row.kind as Opportunity["kind"], sector: row.sector as Opportunity["sector"], title: String(row.title), providerName: String(row.provider_name), location: String(row.location), summary: String(row.summary), deadline: row.deadline ? String(row.deadline) : undefined, applicationUrl: String(row.application_url), sourceUrl: String(row.source_url), retrievedAt: String(row.retrieved_at), verifiedAt: row.verified_at ? String(row.verified_at) : undefined, freshness: row.freshness as Opportunity["freshness"], state: row.state as Opportunity["state"], publicationState: row.publication_state as Opportunity["publicationState"],
    requirements: ((row.requirements as Row[] | null) ?? []).map((requirement): Requirement => ({ id: String(requirement.id), opportunityId: String(requirement.opportunity_id), kind: requirement.kind as Requirement["kind"], label: String(requirement.label), structuredValue: (requirement.structured_value as Record<string, unknown> | null) ?? undefined, supportingText: String(requirement.supporting_text), sourceUrl: String(requirement.source_url), retrievedAt: String(requirement.retrieved_at), verifiedAt: requirement.verified_at ? String(requirement.verified_at) : undefined, freshness: requirement.freshness as Requirement["freshness"], conflict: Boolean(requirement.conflict), publicationState: requirement.publication_state as Requirement["publicationState"], hardRequirement: Boolean(requirement.hard_requirement) })),
  };
}

export async function POST() {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to refresh this week.", 401, "unauthorised");

  const [entitlementResult, latestResult, profileResult, qualificationsResult, portfolioResult, linksResult, evidenceResult] = await Promise.all([
    context.supabase.from("entitlements").select("plan,status,ends_at").eq("user_id", context.user.id).maybeSingle(),
    context.supabase.from("plan_refreshes").select("refreshed_at").eq("user_id", context.user.id).order("refreshed_at", { ascending: false }).limit(1).maybeSingle(),
    context.supabase.from("profiles").select("qualifications_complete").eq("id", context.user.id).maybeSingle(),
    context.supabase.from("qualifications").select("id,qualification_type,subject,grade,status").eq("user_id", context.user.id),
    context.supabase
      .from("portfolio_items")
      .select(
        `id, opportunities(${publicOpportunityWithRequirements}), applications(stage,deadline,next_action)`,
      )
      .eq("user_id", context.user.id)
      .eq("active", true),
    context.supabase.from("evidence_requirement_links").select("requirement_id,evidence_id,coverage,confirmed_by_student,missing_specificity").eq("user_id", context.user.id),
    context.supabase.from("evidence_items").select("id,archived").eq("user_id", context.user.id),
  ]);
  const entitlement = entitlementResult.data
    ? { plan: entitlementResult.data.plan, status: entitlementResult.data.status, endsAt: entitlementResult.data.ends_at }
    : null;
  if (activePlan(entitlement as Parameters<typeof activePlan>[0]) === "free" && latestResult.data) {
    const latest = new Date(latestResult.data.refreshed_at);
    const now = new Date();
    if (latest.getUTCFullYear() === now.getUTCFullYear() && latest.getUTCMonth() === now.getUTCMonth()) {
      return apiError("Free includes one refreshed weekly plan each calendar month.", 403, "refresh-limit");
    }
  }
  if (!profileResult.data) return apiError("Complete your readiness check first.", 409, "profile-required");
  if (qualificationsResult.error || portfolioResult.error || linksResult.error || evidenceResult.error) return apiError("A weekly plan could not be created.", 503, "unavailable");

  const archivedEvidenceIds = new Set((evidenceResult.data ?? []).filter((item) => item.archived).map((item) => item.id));
  const links = (linksResult.data ?? []).map((link) => ({ requirementId: link.requirement_id, evidenceId: link.evidence_id, coverage: link.coverage, confirmedByStudent: link.confirmed_by_student, missingSpecificity: link.missing_specificity ?? undefined, archived: archivedEvidenceIds.has(link.evidence_id) }));
  const qualifications: Qualification[] = (qualificationsResult.data ?? []).map((row) => ({ id: row.id, qualificationType: row.qualification_type, subject: row.subject, grade: row.grade ?? undefined, status: row.status }));
  const candidates: TaskCandidate[] = [];
  for (const item of portfolioResult.data ?? []) {
    const opportunityRow = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities;
    if (!opportunityRow) continue;
    const opportunity = opportunityFromRow(opportunityRow as unknown as Row);
    const application = item.applications?.[0];
    candidates.push(...candidatesForOpportunity(item.id, opportunity, assessOpportunityRequirements(opportunity, qualifications, profileResult.data.qualifications_complete ?? false, links), { stage: application?.stage, deadline: application?.deadline ?? undefined, nextAction: application?.next_action }));
  }
  if (!candidates.length) return apiError("Add a reviewed opportunity with requirements before refreshing this week.", 409, "portfolio-required");
  const selected = selectThisWeek(candidates);
  const inputHash = createHash("sha256").update(JSON.stringify(candidates)).digest("hex");
  const { data: tasks, error } = await context.admin.rpc("replace_weekly_plan", {
    p_user_id: context.user.id,
    p_input_hash: inputHash,
    p_tasks: selected.map((candidate) => ({
      portfolio_item_id: candidate.id.split(":")[0],
      requirement_id: candidate.requirement?.id,
      title: candidate.title,
      why_it_matters: candidate.whyItMatters,
      effort_minutes: candidate.effortMinutes,
      due_date: candidate.dueDate?.slice(0, 10),
    })),
  });

  if (databaseErrorIs(error, "entitlement_limit:weekly_refreshes")) {
    return apiError("Free includes one refreshed weekly plan each calendar month.", 403, "refresh-limit");
  }
  if (databaseErrorIs(error, "relationship_invalid:")) {
    return apiError("A saved opportunity changed while the weekly plan was being created.", 409, "relationship-invalid");
  }
  if (error) return apiError("A weekly plan could not be saved.", 503, "unavailable");
  return NextResponse.json({ tasks: tasks ?? [] });
}
