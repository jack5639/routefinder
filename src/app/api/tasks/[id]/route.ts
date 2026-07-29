import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { selectThisWeek, type TaskCandidate } from "@/lib/mvp/tasks";

const updateSchema = z.object({
  status: z.enum(["scheduled", "completed", "deferred"]),
  reflection: z.string().trim().max(1000).optional(),
  dueDate: z.string().date().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to update this action.", 401, "unauthorised");

  const parsed = updateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the action update and try again.");
  const { id } = await params;
  const { data, error } = await context.supabase
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

  if (error) return apiError("The action could not be updated.", 404, "not-found");
  if (parsed.data.status === "completed") {
    await context.supabase.from("analytics_events").insert({
      user_id: context.user.id,
      event_name: "action_completed",
      properties: {},
    });
    const [scheduledResult, usedResult, portfolioResult, linksResult] = await Promise.all([
      context.supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", context.user.id).eq("status", "scheduled"),
      context.supabase.from("tasks").select("requirement_id").eq("user_id", context.user.id).not("requirement_id", "is", null),
      context.supabase
        .from("portfolio_items")
        .select("id, opportunities(id,title,deadline,requirements(*)), applications(deadline)")
        .eq("user_id", context.user.id)
        .eq("active", true),
      context.supabase.from("evidence_requirement_links").select("requirement_id,coverage").eq("user_id", context.user.id),
    ]);
    if ((scheduledResult.count ?? 0) < 3 && !portfolioResult.error && !linksResult.error) {
      const used = new Set((usedResult.data ?? []).map((task) => task.requirement_id));
      const coverage = new Map((linksResult.data ?? []).map((link) => [link.requirement_id, link.coverage]));
      const candidates: TaskCandidate[] = [];
      for (const item of portfolioResult.data ?? []) {
        const opportunity = Array.isArray(item.opportunities) ? item.opportunities[0] : item.opportunities;
        if (!opportunity) continue;
        const application = item.applications?.[0];
        for (const requirement of opportunity.requirements ?? []) {
          if (used.has(requirement.id) || coverage.get(requirement.id) === "supported") continue;
          candidates.push({
            id: `${item.id}:${requirement.id}`,
            title: requirement.hard_requirement ? `Confirm ${requirement.label}` : `Strengthen evidence for ${requirement.label}`,
            whyItMatters: requirement.hard_requirement
              ? `This is a hard requirement for ${opportunity.title}; check the source directly.`
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
            coverage: coverage.get(requirement.id) ?? (requirement.hard_requirement ? "needs-confirmation" : "missing"),
          });
        }
      }
      const replacement = selectThisWeek(candidates)[0];
      if (replacement) {
        await context.supabase.from("tasks").insert({
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
