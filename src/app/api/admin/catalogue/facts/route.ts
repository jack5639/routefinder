import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { parseEligibilityRule, serialiseEligibilityRule } from "@/lib/scoring/eligibility-rules";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const bodySchema = z.union([
  z.object({
    action: z.literal("verify-opportunity"),
    opportunityId: z.string().uuid(),
    state: z.enum(["open", "closed", "unknown"]),
    freshness: z.enum(["high", "medium", "low", "needs-checking"]),
  }),
  z.object({
    action: z.literal("add-requirement"),
    opportunityId: z.string().uuid(),
    kind: z.enum(["qualification", "subject", "grade", "experience", "skill", "application-stage", "other"]),
    label: z.string().trim().min(3).max(240),
    supportingText: z.string().trim().min(5).max(1200),
    sourceUrl: z.string().url(),
    hardRequirement: z.boolean(),
    qualificationType: z.string().trim().max(80).optional(),
    subject: z.string().trim().max(100).optional(),
    minimumGrade: z.string().trim().max(20).optional(),
    eligibilityRule: z.unknown().optional(),
  }),
]);

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const parsed = bodySchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the verification fields.");
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (parsed.data.action === "verify-opportunity") {
    const { error } = await admin.from("opportunities").update({
      state: parsed.data.state,
      freshness: parsed.data.freshness,
      verified_at: now,
      updated_at: now,
    }).eq("id", parsed.data.opportunityId);
    if (error) return apiError("The opportunity could not be verified.", 503, "unavailable");
    await admin.from("audit_events").insert({ user_id: context.user.id, action: "catalogue.opportunity_verified", entity_type: "opportunity", entity_id: parsed.data.opportunityId, metadata: { freshness: parsed.data.freshness } });
    return NextResponse.json({ verified: true });
  }

  const legacyStructuredValue = {
    ...(parsed.data.qualificationType ? { qualificationType: parsed.data.qualificationType } : {}),
    ...(parsed.data.subject ? { subject: parsed.data.subject } : {}),
    ...(parsed.data.minimumGrade ? { minimumGrade: parsed.data.minimumGrade } : {}),
  };
  const rawRule = parsed.data.eligibilityRule === undefined ? legacyStructuredValue : { eligibilityRule: parsed.data.eligibilityRule };
  const eligibilityRule = parsed.data.hardRequirement ? parseEligibilityRule(rawRule) : undefined;
  if (parsed.data.hardRequirement && parsed.data.kind !== "grade") {
    return apiError("Only supported grade rules can be recorded as deterministic hard requirements.", 422, "unsupported-rule");
  }
  if (parsed.data.hardRequirement && !eligibilityRule) {
    return apiError("A deterministic hard requirement needs a complete supported qualification rule.", 422, "invalid-rule");
  }

  const { data, error } = await admin.from("requirements").insert({
    opportunity_id: parsed.data.opportunityId,
    kind: parsed.data.kind,
    label: parsed.data.label,
    structured_value: eligibilityRule ? serialiseEligibilityRule(eligibilityRule) : legacyStructuredValue,
    supporting_text: parsed.data.supportingText,
    source_url: parsed.data.sourceUrl,
    retrieved_at: now,
    verified_at: now,
    freshness: "high",
    conflict: false,
    hard_requirement: parsed.data.hardRequirement,
    publication_state: "published",
  }).select("id").single();
  if (error) return apiError("The requirement could not be added.", 503, "unavailable");
  await admin.from("publication_reviews").insert({
    requirement_id: data.id,
    reviewer_id: context.user.id,
    decision: "published",
    note: "Manually verified against the recorded provider or employer source.",
  });
  return NextResponse.json({ requirementId: data.id }, { status: 201 });
}
