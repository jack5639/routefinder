import { NextResponse } from "next/server";

import {
  apiError,
  consumeRateLimit,
  databaseErrorIs,
  getApiContext,
  getMutationApiContext,
  parseJson,
} from "@/lib/api-context";
import { canAddEvidence } from "@/lib/mvp/entitlements";
import { evidenceSchema } from "@/lib/mvp/schemas";
import { publicRequirementColumns } from "@/lib/supabase/public-catalogue";

export async function GET() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to view your evidence.", 401, "unauthorised");

  const { data, error } = await context.supabase
    .from("evidence_items")
    .select(`*, evidence_requirement_links(*, requirements(${publicRequirementColumns}, opportunities(title)))`)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });

  return error ? apiError("Your evidence is temporarily unavailable.", 503, "unavailable") : NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to add evidence.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "evidence-write", 40, 3600))) {
    return apiError("Too many evidence changes. Try again shortly.", 429, "rate-limited");
  }

  const parsed = evidenceSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Complete each required evidence field.");

  const [countResult, entitlementResult] = await Promise.all([
    context.supabase.from("evidence_items").select("*", { count: "exact", head: true }).eq("user_id", context.user.id).eq("archived", false),
    context.supabase.from("entitlements").select("plan,status,ends_at").eq("user_id", context.user.id).maybeSingle(),
  ]);

  const entitlement = entitlementResult.data
    ? { plan: entitlementResult.data.plan, status: entitlementResult.data.status, endsAt: entitlementResult.data.ends_at }
    : null;

  if (!canAddEvidence(entitlement as Parameters<typeof canAddEvidence>[0], countResult.count ?? 0)) {
    return apiError("The Free evidence limit is ten items. Cycle removes this limit.", 403, "limit-reached");
  }

  const { data, error } = await context.admin
    .from("evidence_items")
    .insert({
      user_id: context.user.id,
      evidence_type: parsed.data.evidenceType,
      happened: parsed.data.happened,
      contribution: parsed.data.contribution,
      outcome: parsed.data.outcome,
      learned: parsed.data.learned,
      supporting_detail: parsed.data.supportingDetail || null,
      evidence_date: parsed.data.evidenceDate || null,
    })
    .select("*")
    .single();

  if (databaseErrorIs(error, "entitlement_limit:evidence_items")) {
    return apiError("The Free evidence limit is ten items. Cycle removes this limit.", 403, "limit-reached");
  }
  if (error) return apiError("The evidence item could not be saved.", 503, "unavailable");

  await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "evidence_added",
    properties: { evidence_type: parsed.data.evidenceType },
  });

  return NextResponse.json({ item: data }, { status: 201 });
}
