import { NextResponse } from "next/server";

import {
  apiError,
  consumeRateLimit,
  databaseErrorIs,
  getApiContext,
  getMutationApiContext,
  parseJson,
} from "@/lib/api-context";
import { selectThisWeek, type TaskCandidate } from "@/lib/mvp/tasks";
import { z } from "zod";

const taskSchema = z.object({
  title: z.string().trim().min(3).max(160),
  whyItMatters: z.string().trim().min(5).max(600),
  effortMinutes: z.number().int().min(5).max(1440),
  dueDate: z.string().date().optional(),
  portfolioItemId: z.string().uuid().optional(),
  requirementId: z.string().uuid().optional(),
});

export async function GET() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to view this week.", 401, "unauthorised");

  const { data, error } = await context.supabase
    .from("tasks")
    .select("*, portfolio_items(external_title, opportunities(title, provider_name)), requirements(label, hard_requirement)")
    .eq("user_id", context.user.id)
    .in("status", ["scheduled", "deferred"])
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) return apiError("This week is temporarily unavailable.", 503, "unavailable");
  return NextResponse.json({ tasks: (data ?? []).slice(0, 3) });
}

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to schedule an action.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "task-write", 30, 3600))) {
    return apiError("Too many action changes. Try again shortly.", 429, "rate-limited");
  }

  const parsed = taskSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the action details and try again.");
  let ownedOpportunityId: string | null | undefined;
  if (parsed.data.portfolioItemId) {
    const { data: ownedItem } = await context.supabase
      .from("portfolio_items")
      .select("id,opportunity_id")
      .eq("id", parsed.data.portfolioItemId)
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (!ownedItem) return apiError("That saved opportunity is unavailable.", 404, "not-found");
    ownedOpportunityId = ownedItem.opportunity_id;
  }
  if (parsed.data.requirementId) {
    const { data: publishedRequirement } = await context.supabase
      .from("requirements")
      .select("id,opportunity_id")
      .eq("id", parsed.data.requirementId)
      .eq("publication_state", "published")
      .maybeSingle();
    if (!publishedRequirement) return apiError("That reviewed requirement is unavailable.", 404, "not-found");
    if (!parsed.data.portfolioItemId || ownedOpportunityId !== publishedRequirement.opportunity_id) {
      return apiError("That requirement does not belong to the saved opportunity.", 409, "relationship-invalid");
    }
  }

  const candidate: TaskCandidate = {
    id: crypto.randomUUID(),
    title: parsed.data.title,
    whyItMatters: parsed.data.whyItMatters,
    effortMinutes: parsed.data.effortMinutes,
    dueDate: parsed.data.dueDate,
  };
  const [selected] = selectThisWeek([candidate]);

  const { data, error } = await context.admin
    .from("tasks")
    .insert({
      user_id: context.user.id,
      portfolio_item_id: parsed.data.portfolioItemId,
      requirement_id: parsed.data.requirementId,
      title: selected.title,
      why_it_matters: selected.whyItMatters,
      effort_minutes: selected.effortMinutes,
      due_date: selected.dueDate,
    })
    .select("*")
    .single();

  if (databaseErrorIs(error, "workflow_limit:this_week_tasks")) {
    return apiError("This Week already contains three priority actions.", 409, "task-limit");
  }
  if (databaseErrorIs(error, "relationship_invalid:")) {
    return apiError("That action no longer matches the saved opportunity.", 409, "relationship-invalid");
  }
  if (error) return apiError("The action could not be scheduled.", 503, "unavailable");
  await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "action_scheduled",
    properties: {},
  });
  return NextResponse.json({ task: data }, { status: 201 });
}
