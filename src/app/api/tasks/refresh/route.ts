import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { apiError, getApiContext } from "@/lib/api-context";
import { activePlan } from "@/lib/mvp/entitlements";
import { selectThisWeek, type TaskCandidate } from "@/lib/mvp/tasks";

export async function POST() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to refresh this week.", 401, "unauthorised");

  const [entitlementResult, latestResult, portfolioResult, linksResult] = await Promise.all([
    context.supabase.from("entitlements").select("plan,status,ends_at").eq("user_id", context.user.id).maybeSingle(),
    context.supabase.from("plan_refreshes").select("refreshed_at").eq("user_id", context.user.id).order("refreshed_at", { ascending: false }).limit(1).maybeSingle(),
    context.supabase
      .from("portfolio_items")
      .select("id, opportunities(id,title,deadline,requirements(*)), applications(stage,deadline,next_action)")
      .eq("user_id", context.user.id)
      .eq("active", true),
    context.supabase.from("evidence_requirement_links").select("requirement_id,coverage").eq("user_id", context.user.id),
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
  if (portfolioResult.error || linksResult.error) return apiError("A weekly plan could not be created.", 503, "unavailable");

  const coverage = new Map((linksResult.data ?? []).map((link) => [link.requirement_id, link.coverage]));
  const candidates: TaskCandidate[] = [];
  for (const item of portfolioResult.data ?? []) {
    const opportunity = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities;
    if (!opportunity) continue;
    const application = item.applications?.[0];
    for (const requirement of opportunity.requirements ?? []) {
      const currentCoverage = coverage.get(requirement.id);
      if (currentCoverage === "supported") continue;
      candidates.push({
        id: `${item.id}:${requirement.id}`,
        title: requirement.hard_requirement ? `Confirm ${requirement.label}` : `Strengthen evidence for ${requirement.label}`,
        whyItMatters: requirement.hard_requirement
          ? `This is recorded as a hard requirement for ${opportunity.title}; check the source directly.`
          : `This could improve application readiness for ${opportunity.title}.`,
        effortMinutes: requirement.hard_requirement ? 20 : 40,
        dueDate: application?.deadline ?? opportunity.deadline ?? undefined,
        requirement: {
          id: requirement.id,
          opportunityId: opportunity.id,
          kind: requirement.kind,
          label: requirement.label,
          structuredValue: requirement.structured_value ?? undefined,
          supportingText: requirement.supporting_text,
          sourceUrl: requirement.source_url,
          retrievedAt: requirement.retrieved_at,
          verifiedAt: requirement.verified_at ?? undefined,
          freshness: requirement.freshness,
          conflict: requirement.conflict,
          publicationState: requirement.publication_state,
          hardRequirement: requirement.hard_requirement,
        },
        coverage: currentCoverage ?? (requirement.hard_requirement ? "needs-confirmation" : "missing"),
        applicationStageBlocked: application?.stage === "preparing" && !application.next_action,
        sharedOpportunityCount: 1,
      });
    }
  }
  if (!candidates.length) return apiError("Add a reviewed opportunity with requirements before refreshing this week.", 409, "portfolio-required");
  const selected = selectThisWeek(candidates);
  await context.supabase.from("tasks").delete().eq("user_id", context.user.id).in("status", ["scheduled", "deferred"]);
  const { data: tasks, error } = await context.supabase.from("tasks").insert(
    selected.map((candidate) => ({
      user_id: context.user.id,
      portfolio_item_id: candidate.id.split(":")[0],
      requirement_id: candidate.requirement?.id,
      title: candidate.title,
      why_it_matters: candidate.whyItMatters,
      effort_minutes: candidate.effortMinutes,
      due_date: candidate.dueDate?.slice(0, 10),
    })),
  ).select("*");
  if (error) return apiError("A weekly plan could not be saved.", 503, "unavailable");
  const inputHash = createHash("sha256").update(JSON.stringify(candidates)).digest("hex");
  await context.supabase.from("plan_refreshes").insert({
    user_id: context.user.id,
    input_hash: inputHash,
    selected_task_ids: (tasks ?? []).map((task) => task.id),
  });
  return NextResponse.json({ tasks: tasks ?? [] });
}
