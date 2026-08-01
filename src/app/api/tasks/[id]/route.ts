import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, databaseErrorIs, getMutationApiContext, parseJson } from "@/lib/api-context";
import { selectThisWeek, type TaskCandidate } from "@/lib/mvp/tasks";
import { assessOpportunityRequirements } from "@/lib/mvp/requirement-assessment";
import { candidatesForOpportunity } from "@/lib/mvp/weekly-candidates";
import type { Opportunity, Qualification, Requirement } from "@/lib/mvp/types";
import { publicOpportunityWithRequirements } from "@/lib/supabase/public-catalogue";

type Row = Record<string, unknown>;
function opportunityFromRow(row: Row): Opportunity {
  return { id: String(row.id), kind: row.kind as Opportunity["kind"], sector: row.sector as Opportunity["sector"], title: String(row.title), providerName: String(row.provider_name), location: String(row.location), summary: String(row.summary), deadline: row.deadline ? String(row.deadline) : undefined, applicationUrl: String(row.application_url), sourceUrl: String(row.source_url), retrievedAt: String(row.retrieved_at), verifiedAt: row.verified_at ? String(row.verified_at) : undefined, freshness: row.freshness as Opportunity["freshness"], state: row.state as Opportunity["state"], publicationState: row.publication_state as Opportunity["publicationState"], requirements: ((row.requirements as Row[] | null) ?? []).map((requirement): Requirement => ({ id: String(requirement.id), opportunityId: String(requirement.opportunity_id), kind: requirement.kind as Requirement["kind"], label: String(requirement.label), structuredValue: (requirement.structured_value as Record<string, unknown> | null) ?? undefined, supportingText: String(requirement.supporting_text), sourceUrl: String(requirement.source_url), retrievedAt: String(requirement.retrieved_at), verifiedAt: requirement.verified_at ? String(requirement.verified_at) : undefined, freshness: requirement.freshness as Requirement["freshness"], conflict: Boolean(requirement.conflict), publicationState: requirement.publication_state as Requirement["publicationState"], hardRequirement: Boolean(requirement.hard_requirement) })) };
}

const updateSchema = z.object({
  status: z.enum(["scheduled", "completed", "deferred"]),
  reflection: z.string().trim().max(1000).optional(),
  dueDate: z.string().date().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to update this action.", 401, "unauthorised");

  const parsed = updateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the action update and try again.");
  const { id } = await params;
  const { data, error } = await context.admin
    .from("tasks")
    .update({
      status: parsed.data.status,
      reflection: parsed.data.reflection,
      due_date: parsed.data.dueDate,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select("*")
    .single();

  if (databaseErrorIs(error, "workflow_limit:this_week_tasks")) {
    return apiError("This Week already contains three priority actions.", 409, "task-limit");
  }
  if (error) return apiError("The action could not be updated.", 404, "not-found");
  if (parsed.data.status === "completed") {
    // Analytics and replenishment are best effort after the task state is
    // correct. A failed candidate refresh never reopens a completed task.
    await context.admin.from("analytics_events").insert({
      user_id: context.user.id,
      event_name: "action_completed",
      properties: {},
    });
    const [scheduledResult, usedResult, profileResult, qualificationsResult, portfolioResult, linksResult, evidenceResult] = await Promise.all([
      context.supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", context.user.id).eq("status", "scheduled"),
      context.supabase.from("tasks").select("requirement_id").eq("user_id", context.user.id).not("requirement_id", "is", null),
      context.supabase.from("profiles").select("qualifications_complete").eq("id", context.user.id).maybeSingle(),
      context.supabase.from("qualifications").select("id,qualification_type,subject,grade,status").eq("user_id", context.user.id),
      context.supabase
        .from("portfolio_items")
        .select(`id, opportunities(${publicOpportunityWithRequirements}), applications(stage,deadline,next_action)`)
        .eq("user_id", context.user.id)
        .eq("active", true),
      context.supabase.from("evidence_requirement_links").select("requirement_id,evidence_id,coverage,confirmed_by_student,missing_specificity").eq("user_id", context.user.id),
      context.supabase.from("evidence_items").select("id,archived").eq("user_id", context.user.id),
    ]);
    if ((scheduledResult.count ?? 0) < 3 && profileResult.data && !qualificationsResult.error && !portfolioResult.error && !linksResult.error && !evidenceResult.error) {
      const used = new Set((usedResult.data ?? []).map((task) => task.requirement_id));
      const archivedEvidenceIds = new Set((evidenceResult.data ?? []).filter((item) => item.archived).map((item) => item.id));
      const links = (linksResult.data ?? []).map((link) => ({ requirementId: link.requirement_id, evidenceId: link.evidence_id, coverage: link.coverage, confirmedByStudent: link.confirmed_by_student, missingSpecificity: link.missing_specificity ?? undefined, archived: archivedEvidenceIds.has(link.evidence_id) }));
      const qualifications: Qualification[] = (qualificationsResult.data ?? []).map((row) => ({ id: row.id, qualificationType: row.qualification_type, subject: row.subject, grade: row.grade ?? undefined, status: row.status }));
      const candidates: TaskCandidate[] = [];
      for (const item of portfolioResult.data ?? []) {
        const opportunityRow = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities;
        if (!opportunityRow) continue;
        const opportunity = opportunityFromRow(opportunityRow as unknown as Row);
        const application = item.applications?.[0];
        candidates.push(...candidatesForOpportunity(item.id, opportunity, assessOpportunityRequirements(opportunity, qualifications, profileResult.data.qualifications_complete ?? false, links), { stage: application?.stage, deadline: application?.deadline ?? undefined, nextAction: application?.next_action }).filter((candidate) => !used.has(candidate.requirement?.id)));
      }
      const replacement = selectThisWeek(candidates)[0];
      if (replacement) {
        await context.admin.from("tasks").insert({
          user_id: context.user.id,
          portfolio_item_id: replacement.id.split(":")[0],
          requirement_id: replacement.requirement?.id,
          title: replacement.title,
          why_it_matters: replacement.whyItMatters,
          effort_minutes: replacement.effortMinutes,
          due_date: replacement.dueDate?.slice(0, 10),
        });
      }
    }
  }
  return NextResponse.json({ task: data });
}
