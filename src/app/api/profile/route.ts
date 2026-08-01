import { NextResponse } from "next/server";

import { apiError, consumeRateLimit, getApiContext, getMutationApiContext, parseJson } from "@/lib/api-context";
import { profileSchema } from "@/lib/mvp/schemas";

export async function GET() {
  const context = await getApiContext();

  if (!context) {
    return apiError("Sign in to view your readiness profile.", 401, "unauthorised");
  }

  const [profile, qualifications, consents] = await Promise.all([
    context.supabase.from("profiles").select("*").eq("id", context.user.id).maybeSingle(),
    context.supabase.from("qualifications").select("*").eq("user_id", context.user.id).order("created_at"),
    context.supabase.from("consent_records").select("*").eq("user_id", context.user.id).order("recorded_at", { ascending: false }),
  ]);

  if (profile.error || qualifications.error || consents.error) {
    return apiError("Your profile is temporarily unavailable.", 503, "unavailable");
  }

  return NextResponse.json({
    profile: profile.data,
    qualifications: qualifications.data,
    consents: consents.data,
  });
}

export async function PUT(request: Request) {
  const context = await getMutationApiContext();

  if (!context) {
    return apiError("Sign in to save your readiness profile.", 401, "unauthorised");
  }

  if (!(await consumeRateLimit(context, "profile-write", 20, 3600))) {
    return apiError("Too many profile updates. Try again shortly.", 429, "rate-limited");
  }

  const parsed = profileSchema.safeParse(await parseJson(request));

  if (!parsed.success) {
    return apiError("Check the highlighted readiness information.", 400, "invalid");
  }

  const { qualifications, policyVersion, ...profile } = parsed.data;
  const profileRow = {
    current_stage: profile.currentStage,
    application_cycle: profile.applicationCycle,
    home_region: profile.homeRegion,
    max_travel_minutes: profile.maxTravelMinutes,
    relocation_preference: profile.relocationPreference,
    route_intent: profile.routeIntent,
    sectors: profile.sectors,
    work_styles: profile.workStyles,
    financial_preference: profile.financialPreference,
    constraints: profile.constraints,
    qualifications_complete: profile.qualificationsComplete,
    experience_summary: profile.experienceSummary || null,
  };

  const replacement = await context.admin.rpc("save_readiness_profile", {
    p_user_id: context.user.id,
    p_profile: profileRow,
    p_qualifications: qualifications.map((qualification) => ({
      ...(qualification.id ? { id: qualification.id } : {}),
      qualification_type: qualification.qualificationType,
      subject: qualification.subject,
      grade: qualification.grade ?? null,
      status: qualification.status,
    })),
    p_policy_version: policyVersion,
  });
  if (replacement.error) {
    return apiError("Your readiness information could not be saved. Nothing was changed; please try again.", 503, "unavailable");
  }

  // Product analytics is deliberately best effort. Profile, consent, and the
  // operational audit record have already committed atomically in the RPC.
  await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "readiness_completed",
    properties: { application_cycle: profile.applicationCycle },
  });

  return NextResponse.json({ ok: true });
}
