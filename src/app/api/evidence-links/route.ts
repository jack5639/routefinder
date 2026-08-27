import { NextResponse } from "next/server";

import { apiError, databaseErrorIs, getMutationApiContext, parseJson } from "@/lib/api-context";
import { evidenceLinkSchema } from "@/lib/mvp/schemas";
import { createHash } from "node:crypto";

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to map evidence.", 401, "unauthorised");

  const parsed = evidenceLinkSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the evidence link.");

  const owned = await context.supabase
    .from("evidence_items")
    .select("id")
    .eq("id", parsed.data.evidenceId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (!owned.data) return apiError("That evidence item is unavailable.", 404, "not-found");
  const { data: requirement } = await context.supabase
    .from("requirements")
    .select("id,opportunity_id,hard_requirement,kind")
    .eq("id", parsed.data.requirementId)
    .eq("publication_state", "published")
    .maybeSingle();
  if (!requirement) return apiError("That reviewed requirement is unavailable.", 404, "not-found");
  if (requirement.hard_requirement && requirement.kind === "grade") {
    return apiError("Hard grade requirements are assessed from your qualifications, not evidence examples.", 409, "deterministic-requirement");
  }
  const { data: savedOpportunity } = await context.supabase
    .from("portfolio_items")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("opportunity_id", requirement.opportunity_id)
    .eq("active", true)
    .maybeSingle();
  if (!savedOpportunity) return apiError("Save the related opportunity before mapping evidence.", 409, "portfolio-required");

  const { data, error } = await context.admin.rpc("save_evidence_requirement_link", {
    p_user_id: context.user.id,
    p_evidence_id: parsed.data.evidenceId,
    p_requirement_id: parsed.data.requirementId,
    p_relevance: parsed.data.relevance,
    p_coverage: parsed.data.coverage,
    p_missing_specificity: parsed.data.missingSpecificity || "",
    p_confirmed_by_student: parsed.data.confirmedByStudent,
    p_input_hash: createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex"),
  });

  if (databaseErrorIs(error, "relationship_invalid:")) {
    return apiError("The evidence and requirement can no longer be linked.", 409, "relationship-invalid");
  }
  if (error) return apiError("The evidence link could not be saved.", 503, "unavailable");
  return NextResponse.json({ link: data });
}
