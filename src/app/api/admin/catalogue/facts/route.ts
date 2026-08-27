import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { isSameOriginRequest } from "@/lib/same-origin";
import { parseEligibilityRule, serialiseEligibilityRule } from "@/lib/scoring/eligibility-rules";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const requirementFactSchema = z.object({
  kind: z.enum(["qualification", "subject", "grade", "experience", "skill", "application-stage", "other"]),
  label: z.string().trim().min(3).max(240),
  supportingText: z.string().trim().min(5).max(1200),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().datetime().optional(),
  hardRequirement: z.boolean(),
  qualificationType: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(100).optional(),
  minimumGrade: z.string().trim().max(20).optional(),
  eligibilityRule: z.unknown().optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify-opportunity"),
    opportunityId: z.string().uuid(),
    state: z.enum(["open", "closed", "unknown"]),
    freshness: z.enum(["high", "medium", "low", "needs-checking"]),
    note: z.string().trim().min(3).max(1000).default("Opportunity reverified against the recorded primary source."),
  }),
  z.object({
    action: z.literal("verify-opportunity-cycle"),
    opportunityId: z.string().uuid(),
    applicationCycle: z.literal(2027),
    note: z.string().trim().min(3).max(1000),
  }),
  z.object({
    action: z.literal("edit-opportunity"),
    opportunityId: z.string().uuid(),
    title: z.string().trim().min(3).max(200),
    providerName: z.string().trim().min(2).max(200),
    sector: z.enum(["technology", "engineering", "business", "finance", "unclassified"]),
    location: z.string().trim().min(2).max(200),
    summary: z.string().trim().min(10).max(1200),
    deadline: z.string().datetime().nullable().optional(),
    applicationUrl: z.string().url(),
    sourceUrl: z.string().url(),
    state: z.enum(["open", "closed", "unknown"]),
    freshness: z.enum(["high", "medium", "low", "needs-checking"]),
    retrievedAt: z.string().datetime().optional(),
    attribution: z.record(z.string(), z.string()).optional(),
    note: z.string().trim().min(3).max(1000),
  }),
  z.object({
    action: z.literal("add-requirement"),
    opportunityId: z.string().uuid(),
    note: z.string().trim().min(3).max(1000).default("Requirement reviewed against the recorded primary source."),
  }).extend(requirementFactSchema.shape),
  z.object({
    action: z.enum(["edit-requirement", "supersede-requirement"]),
    opportunityId: z.string().uuid(),
    requirementId: z.string().uuid(),
    note: z.string().trim().min(3).max(1000),
  }).extend(requirementFactSchema.shape),
  z.object({
    action: z.enum(["reverify-requirement", "mark-conflicting", "resolve-conflict", "withdraw-requirement"]),
    opportunityId: z.string().uuid(),
    requirementId: z.string().uuid(),
    note: z.string().trim().min(3).max(1000),
  }),
  z.object({
    action: z.literal("resolve-source-issue"),
    opportunityId: z.string().uuid(),
    issueId: z.string().uuid(),
    note: z.string().trim().min(3).max(1000),
  }),
]);

function requirementFact(data: z.infer<typeof requirementFactSchema>) {
  const legacy = {
    ...(data.qualificationType ? { qualificationType: data.qualificationType } : {}),
    ...(data.subject ? { subject: data.subject } : {}),
    ...(data.minimumGrade ? { minimumGrade: data.minimumGrade } : {}),
  };
  const rawRule = data.eligibilityRule === undefined ? legacy : { eligibilityRule: data.eligibilityRule };
  const eligibilityRule = data.hardRequirement ? parseEligibilityRule(rawRule) : undefined;
  if (data.hardRequirement && data.kind !== "grade") return { error: "Only supported grade rules can be recorded as deterministic hard requirements." };
  if (data.hardRequirement && !eligibilityRule) return { error: "A deterministic hard requirement needs a complete supported qualification rule." };
  return {
    value: {
      kind: data.kind,
      label: data.label,
      supportingText: data.supportingText,
      sourceUrl: data.sourceUrl,
      ...(data.retrievedAt ? { retrievedAt: data.retrievedAt } : {}),
      hardRequirement: data.hardRequirement,
      structuredValue: eligibilityRule ? serialiseEligibilityRule(eligibilityRule) : legacy,
    },
  };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiError("Cross-origin requests are not allowed.", 403, "cross-origin");
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const parsed = bodySchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the verification fields.", 400, "invalid");
  const admin = createAdminClient();
  if (parsed.data.action === "resolve-source-issue") {
    const result = await admin.rpc("resolve_catalogue_source_issue", {
      p_issue_id: parsed.data.issueId,
      p_reviewer_id: context.user.id,
      p_note: parsed.data.note,
    });
    if (result.error) return apiError("The source issue could not be resolved; nothing was changed.", 409, "mutation-failed");
    return NextResponse.json({ saved: true });
  }
  if (parsed.data.action === "verify-opportunity-cycle") {
    const result = await admin.rpc("verify_catalogue_opportunity_cycle", {
      p_opportunity_id: parsed.data.opportunityId,
      p_reviewer_id: context.user.id,
      p_application_cycle: parsed.data.applicationCycle,
      p_note: parsed.data.note,
    });
    if (result.error) return apiError("The application cycle could not be verified; nothing was changed.", 409, "mutation-failed");
    return NextResponse.json({ saved: true });
  }
  let rpcAction: string = parsed.data.action;
  let requirementId: string | null = "requirementId" in parsed.data ? parsed.data.requirementId : null;
  let fact: Record<string, unknown> = {};

  if (parsed.data.action === "verify-opportunity") {
    const current = await admin.from("opportunities").select("title,provider_name,sector,location,summary,deadline,application_url,source_url,retrieved_at,attribution").eq("id", parsed.data.opportunityId).single();
    if (current.error || !current.data) return apiError("Opportunity not found.", 404, "not-found");
    rpcAction = "edit-opportunity";
    fact = {
      title: current.data.title,
      providerName: current.data.provider_name,
      sector: current.data.sector,
      location: current.data.location,
      summary: current.data.summary,
      deadline: current.data.deadline,
      applicationUrl: current.data.application_url,
      sourceUrl: current.data.source_url,
      retrievedAt: current.data.retrieved_at,
      attribution: current.data.attribution,
      state: parsed.data.state,
      freshness: parsed.data.freshness,
    };
  } else if (parsed.data.action === "edit-opportunity") {
    fact = {
      title: parsed.data.title,
      providerName: parsed.data.providerName,
      sector: parsed.data.sector,
      location: parsed.data.location,
      summary: parsed.data.summary,
      deadline: parsed.data.deadline ?? null,
      applicationUrl: parsed.data.applicationUrl,
      sourceUrl: parsed.data.sourceUrl,
      state: parsed.data.state,
      freshness: parsed.data.freshness,
      ...(parsed.data.retrievedAt ? { retrievedAt: parsed.data.retrievedAt } : {}),
      ...(parsed.data.attribution ? { attribution: parsed.data.attribution } : {}),
    };
  } else if (
    parsed.data.action === "add-requirement"
    || parsed.data.action === "edit-requirement"
    || parsed.data.action === "supersede-requirement"
  ) {
    const prepared = requirementFact(parsed.data);
    if (prepared.error) return apiError(prepared.error, 422, parsed.data.hardRequirement ? "invalid-rule" : "invalid");
    fact = prepared.value!;
    if (parsed.data.action === "add-requirement") rpcAction = "create-requirement";
  }

  const result = await admin.rpc("review_catalogue_fact_mutation", {
    p_opportunity_id: parsed.data.opportunityId,
    p_requirement_id: requirementId,
    p_reviewer_id: context.user.id,
    p_action: rpcAction,
    p_fact: fact,
    p_note: parsed.data.note,
  });
  if (result.error) return apiError("The reviewed fact could not be saved; nothing was changed.", 409, "mutation-failed");
  return NextResponse.json({ saved: true, requirementId: result.data ?? requirementId }, { status: parsed.data.action === "add-requirement" ? 201 : 200 });
}
