import { NextResponse } from "next/server";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { evidenceLinkSchema } from "@/lib/mvp/schemas";
import { createHash } from "node:crypto";

export async function POST(request: Request) {
  const context = await getApiContext();
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
    .select("id,opportunity_id")
    .eq("id", parsed.data.requirementId)
    .eq("publication_state", "published")
    .maybeSingle();
  if (!requirement) return apiError("That reviewed requirement is unavailable.", 404, "not-found");
  const { data: savedOpportunity } = await context.supabase
    .from("portfolio_items")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("opportunity_id", requirement.opportunity_id)
    .eq("active", true)
    .maybeSingle();
  if (!savedOpportunity) return apiError("Save the related opportunity before mapping evidence.", 409, "portfolio-required");

  const { data, error } = await context.supabase
    .from("evidence_requirement_links")
    .upsert({
      user_id: context.user.id,
      evidence_id: parsed.data.evidenceId,
      requirement_id: parsed.data.requirementId,
      relevance: parsed.data.relevance,
      coverage: parsed.data.coverage,
      missing_specificity: parsed.data.missingSpecificity || null,
      confirmed_by_student: parsed.data.confirmedByStudent,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) return apiError("The evidence link could not be saved.", 503, "unavailable");
  await context.supabase.from("assessment_versions").insert({
    user_id: context.user.id,
    reason: "evidence-link-updated",
    input_hash: createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex"),
    summary: { requirement_id: parsed.data.requirementId, coverage: parsed.data.coverage },
  });
  return NextResponse.json({ link: data });
}
