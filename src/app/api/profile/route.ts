import { NextResponse } from "next/server";

import { apiError, consumeRateLimit, getApiContext, parseJson } from "@/lib/api-context";
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
  const context = await getApiContext();

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
    id: context.user.id,
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
    experience_summary: profile.experienceSummary || null,
    updated_at: new Date().toISOString(),
  };

  const profileResult = await context.supabase.from("profiles").upsert(profileRow);

  if (profileResult.error) {
    return apiError("Your readiness profile could not be saved.", 503, "unavailable");
  }

  const existing = await context.supabase.from("qualifications").select("id").eq("user_id", context.user.id);
  const incomingIds = new Set(qualifications.flatMap((qualification) => (qualification.id ? [qualification.id] : [])));
  const removeIds = (existing.data ?? []).map((row) => row.id).filter((id) => !incomingIds.has(id));

  if (removeIds.length) {
    await context.supabase.from("qualifications").delete().eq("user_id", context.user.id).in("id", removeIds);
  }

  if (qualifications.length) {
    const result = await context.supabase.from("qualifications").upsert(
      qualifications.map((qualification) => ({
        ...(qualification.id ? { id: qualification.id } : {}),
        user_id: context.user.id,
        qualification_type: qualification.qualificationType,
        subject: qualification.subject,
        grade: qualification.grade || null,
        status: qualification.status,
        updated_at: new Date().toISOString(),
      })),
    );

    if (result.error) {
      return apiError("Qualifications could not be saved.", 503, "unavailable");
    }
  }

  await Promise.all([
    context.supabase.from("consent_records").upsert({
      user_id: context.user.id,
      policy_kind: "privacy-and-terms",
      policy_version: policyVersion,
      granted: true,
    }),
    context.supabase.from("audit_events").insert({
      user_id: context.user.id,
      action: "readiness-profile-updated",
      entity_type: "profile",
      entity_id: context.user.id,
    }),
    context.supabase.from("analytics_events").insert({
      user_id: context.user.id,
      event_name: "readiness_completed",
      properties: { application_cycle: profile.applicationCycle },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
