import { NextResponse } from "next/server";

import { apiError, consumeRateLimit, getApiContext, parseJson } from "@/lib/api-context";
import { activePlan, canAddActiveOpportunity } from "@/lib/mvp/entitlements";
import { portfolioCreateSchema } from "@/lib/mvp/schemas";

export async function GET() {
  const context = await getApiContext();

  if (!context) return apiError("Sign in to view your portfolio.", 401, "unauthorised");

  const { data, error } = await context.supabase
    .from("portfolio_items")
    .select("*, opportunities(*, requirements(*)), applications(*)")
    .eq("user_id", context.user.id)
    .order("created_at");

  if (error) return apiError("Your portfolio is temporarily unavailable.", 503, "unavailable");
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getApiContext();

  if (!context) return apiError("Sign in to save an opportunity.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "portfolio-write", 30, 3600))) {
    return apiError("Too many portfolio changes. Try again shortly.", 429, "rate-limited");
  }

  const parsed = portfolioCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Choose a verified opportunity or provide a valid external link.");
  if ("opportunityId" in parsed.data) {
    const { data: opportunity } = await context.supabase
      .from("opportunities")
      .select("id")
      .eq("id", parsed.data.opportunityId)
      .eq("publication_state", "published")
      .maybeSingle();
    if (!opportunity) return apiError("That reviewed opportunity is unavailable.", 404, "not-found");
  }

  const [countResult, entitlementResult] = await Promise.all([
    context.supabase.from("portfolio_items").select("*", { count: "exact", head: true }).eq("user_id", context.user.id).eq("active", true),
    context.supabase.from("entitlements").select("plan,status,ends_at").eq("user_id", context.user.id).maybeSingle(),
  ]);

  const entitlement = entitlementResult.data
    ? { plan: entitlementResult.data.plan, status: entitlementResult.data.status, endsAt: entitlementResult.data.ends_at }
    : null;

  if (!canAddActiveOpportunity(entitlement as Parameters<typeof activePlan>[0], countResult.count ?? 0)) {
    return apiError(
      `Your ${activePlan(entitlement as Parameters<typeof activePlan>[0])} plan has reached its active opportunity limit.`,
      403,
      "limit-reached",
    );
  }

  const row: Record<string, string> =
    "opportunityId" in parsed.data
      ? { user_id: context.user.id, opportunity_id: parsed.data.opportunityId }
      : {
          user_id: context.user.id,
          external_title: parsed.data.externalTitle,
          external_url: parsed.data.externalUrl,
        };

  const { data, error } = await context.supabase.from("portfolio_items").insert(row).select("*").single();

  if (error) return apiError("This opportunity could not be saved.", 503, "unavailable");

  await context.supabase.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "opportunity_saved",
    properties: { source: "opportunityId" in parsed.data ? "catalogue" : "external" },
  });

  return NextResponse.json({ item: data }, { status: 201 });
}
