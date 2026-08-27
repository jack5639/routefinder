import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, consumeRateLimit, getMutationApiContext, parseJson } from "@/lib/api-context";

const legacySchema = z.object({
  currentStage: z.enum(["Year 12", "Year 13"]),
  subjects: z.array(z.string().trim().min(1).max(100)).max(20),
  interests: z.array(z.string().trim().min(1).max(100)).max(20),
  location: z.string().trim().min(2).max(100),
  maxTravelMinutes: z.number().int().min(10).max(180),
  debtPreference: z.enum(["open", "some-concern", "avoid"]),
  workStyles: z.array(z.enum(["academic", "practical", "creative", "people", "technical"])).max(5),
  constraints: z.array(z.string().trim().min(1).max(120)).max(10),
});

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in before importing prototype data.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "prototype-import", 5, 3600))) {
    return apiError("Too many import attempts. Try again shortly.", 429, "rate-limited");
  }
  const parsed = legacySchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("No valid prototype readiness data was found.");
  const hash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
  const { data: prior } = await context.supabase
    .from("prototype_imports")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("source_key", "routefinder.quizAnswers.v1")
    .eq("source_hash", hash)
    .maybeSingle();
  if (prior) return NextResponse.json({ imported: false, duplicate: true });

  const sectorMatches = parsed.data.interests
    .map((interest) => interest.toLowerCase())
    .flatMap((interest) => ["technology", "engineering", "business", "finance"].filter((sector) => interest.includes(sector)));
  const sectors = [...new Set(sectorMatches)];
  const mappedSectors = sectors.length ? sectors : ["technology"];

  const { error: profileError } = await context.admin.from("profiles").upsert({
    id: context.user.id,
    current_stage: parsed.data.currentStage,
    application_cycle: 2027,
    home_region: parsed.data.location,
    max_travel_minutes: parsed.data.maxTravelMinutes,
    relocation_preference: "unsure",
    route_intent: "combined",
    sectors: mappedSectors,
    work_styles: parsed.data.workStyles,
    financial_preference: parsed.data.debtPreference === "avoid" ? "prefer-lower-debt" : parsed.data.debtPreference === "some-concern" ? "cost-aware" : "open",
    constraints: parsed.data.constraints,
    qualifications_complete: false,
    updated_at: new Date().toISOString(),
  });
  if (profileError) return apiError("Prototype data could not be imported.", 503, "unavailable");

  await context.admin.from("qualifications").delete().eq("user_id", context.user.id);
  if (parsed.data.subjects.length) {
    await context.admin.from("qualifications").insert(
      parsed.data.subjects.map((subject) => ({
        user_id: context.user.id,
        qualification_type: "Check qualification type",
        subject,
        status: "unknown",
      })),
    );
  }
  await context.admin.from("prototype_imports").insert({
    user_id: context.user.id,
    source_key: "routefinder.quizAnswers.v1",
    source_hash: hash,
  });
  await context.admin.from("audit_events").insert({
    user_id: context.user.id,
    action: "prototype.imported",
    entity_type: "profile",
    entity_id: context.user.id,
    metadata: { source: "routefinder.quizAnswers.v1" },
  });
  return NextResponse.json({ imported: true });
}
