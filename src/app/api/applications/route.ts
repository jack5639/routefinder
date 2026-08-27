import { NextResponse } from "next/server";

import { apiError, databaseErrorIs, getApiContext, getMutationApiContext, parseJson } from "@/lib/api-context";
import { applicationSchema } from "@/lib/mvp/schemas";

export async function GET() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to view applications.", 401, "unauthorised");

  const { data, error } = await context.supabase
    .from("applications")
    .select("*, portfolio_items(external_title, external_url, opportunity_snapshot, opportunities(title, provider_name, state))")
    .eq("user_id", context.user.id)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) return apiError("Applications are temporarily unavailable.", 503, "unavailable");
  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to track an application.", 401, "unauthorised");
  const parsed = applicationSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the application details and try again.");
  const { data: ownedPortfolioItem } = await context.supabase
    .from("portfolio_items")
    .select("id")
    .eq("id", parsed.data.portfolioItemId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!ownedPortfolioItem) return apiError("That saved opportunity is unavailable.", 404, "not-found");

  const entitlementResult = await context.supabase
    .from("entitlements")
    .select("plan,status,ends_at")
    .eq("user_id", context.user.id)
    .maybeSingle();
  const isCycle =
    entitlementResult.data?.plan === "cycle" &&
    entitlementResult.data.status === "active" &&
    (!entitlementResult.data.ends_at || new Date(entitlementResult.data.ends_at) > new Date());

  const { data, error } = await context.admin
    .from("applications")
    .upsert(
      {
        user_id: context.user.id,
        portfolio_item_id: parsed.data.portfolioItemId,
        stage: parsed.data.stage,
        deadline: parsed.data.deadline,
        official_url: parsed.data.officialUrl,
        next_action: parsed.data.nextAction,
        note: parsed.data.note,
      },
      { onConflict: "portfolio_item_id" },
    )
    .select("*")
    .single();
  if (databaseErrorIs(error, "entitlement_limit:active_applications")) {
    return apiError(
      isCycle ? "Cycle supports up to 15 active applications." : "Free accounts can track five active opportunities.",
      403,
      "limit-reached",
    );
  }
  if (databaseErrorIs(error, "relationship_invalid:")) {
    return apiError("That saved opportunity is unavailable.", 404, "not-found");
  }
  if (error) return apiError("The application could not be saved.", 503, "unavailable");
  return NextResponse.json({ application: data }, { status: 201 });
}
