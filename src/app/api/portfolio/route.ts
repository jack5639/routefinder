import { NextResponse } from "next/server";

import {
  apiError,
  consumeRateLimit,
  databaseErrorIs,
  getApiContext,
  getMutationApiContext,
  parseJson,
} from "@/lib/api-context";
import { activePlan, canAddActiveOpportunity } from "@/lib/mvp/entitlements";
import { portfolioCreateSchema } from "@/lib/mvp/schemas";
import { safeOpportunitySnapshot } from "@/lib/mvp/opportunity-snapshot";
import { publicOpportunityWithRequirements } from "@/lib/supabase/public-catalogue";

export async function GET() {
  const context = await getApiContext();

  if (!context) return apiError("Sign in to view your portfolio.", 401, "unauthorised");

  const { data, error } = await context.supabase
    .from("portfolio_items")
    .select(
      `id,user_id,opportunity_id,opportunity_snapshot,external_title,external_url,active,created_at,updated_at,opportunities(${publicOpportunityWithRequirements}),applications(*)`,
    )
    .eq("user_id", context.user.id)
    .order("created_at");

  if (error) return apiError("Your portfolio is temporarily unavailable.", 503, "unavailable");
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);

  if (!context) return apiError("Sign in to save an opportunity.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "portfolio-write", 30, 3600))) {
    return apiError("Too many portfolio changes. Try again shortly.", 429, "rate-limited");
  }

  const parsed = portfolioCreateSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Choose a verified opportunity or provide a valid external link.");
  let reviewedOpportunity: Record<string, unknown> | null = null;
  if ("opportunityId" in parsed.data) {
    const { data: opportunity } = await context.supabase
      .from("opportunities")
      .select("id,title,provider_name,kind,sector,location,application_url,source_url,source_authority,deadline,state,freshness,publication_state,verified_at")
      .eq("id", parsed.data.opportunityId)
      .eq("publication_state", "published")
      .maybeSingle();
    if (!opportunity) return apiError("That reviewed opportunity is unavailable.", 404, "not-found");
    reviewedOpportunity = opportunity;
  }

  const existingQuery = context.supabase
    .from("portfolio_items")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("active", true);
  const existing =
    "opportunityId" in parsed.data
      ? await existingQuery.eq("opportunity_id", parsed.data.opportunityId).maybeSingle()
      : await existingQuery.eq("external_url", parsed.data.externalUrl).maybeSingle();
  if (existing.error) return apiError("Your saved opportunities are temporarily unavailable.", 503, "unavailable");
  if (existing.data) return NextResponse.json({ item: existing.data, duplicate: true });

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

  const row: Record<string, unknown> =
    "opportunityId" in parsed.data
      ? { user_id: context.user.id, opportunity_id: parsed.data.opportunityId, opportunity_snapshot: safeOpportunitySnapshot(reviewedOpportunity!) }
      : {
          user_id: context.user.id,
          external_title: parsed.data.externalTitle,
          external_url: parsed.data.externalUrl,
        };

  const { data, error } = await context.admin.from("portfolio_items").insert(row).select("*").single();

  if (databaseErrorIs(error, "entitlement_limit:active_opportunities")) {
    return apiError(
      `Your ${activePlan(entitlement as Parameters<typeof activePlan>[0])} plan has reached its active opportunity limit.`,
      403,
      "limit-reached",
    );
  }
  if (databaseErrorIs(error, "duplicate key")) {
    const raced =
      "opportunityId" in parsed.data
        ? await context.admin.from("portfolio_items").select("*").eq("user_id", context.user.id).eq("opportunity_id", parsed.data.opportunityId).eq("active", true).single()
        : await context.admin.from("portfolio_items").select("*").eq("user_id", context.user.id).eq("external_url", parsed.data.externalUrl).eq("active", true).single();
    if (!raced.error) return NextResponse.json({ item: raced.data, duplicate: true });
  }
  if (error) return apiError("This opportunity could not be saved.", 503, "unavailable");

  // Product analytics is best effort and does not own the saved item.
  await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "opportunity_saved",
    properties: { source: "opportunityId" in parsed.data ? "catalogue" : "external" },
  });

  return NextResponse.json({ item: data }, { status: 201 });
}
