import { apiError, getMutationApiContext, parseJson } from "@/lib/api-context";
import { evidenceLinkSchema } from "@/lib/mvp/schemas";
import { createHash } from "node:crypto";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to update an evidence mapping.", 401, "unauthorised");
  const parsed = evidenceLinkSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the evidence mapping.");
  const { id } = await params;
  const current = await context.admin.from("evidence_requirement_links").select("evidence_id,requirement_id,assessment_version").eq("id", id).eq("user_id", context.user.id).maybeSingle();
  if (!current.data || current.data.evidence_id !== parsed.data.evidenceId || current.data.requirement_id !== parsed.data.requirementId) return apiError("That evidence mapping is unavailable.", 404, "not-found");
  const assessmentVersion = current.data.assessment_version + 1;
  const { error } = await context.admin.from("evidence_requirement_links").update({ relevance: parsed.data.relevance, coverage: parsed.data.coverage, missing_specificity: parsed.data.missingSpecificity || null, confirmed_by_student: parsed.data.confirmedByStudent, assessment_version: assessmentVersion, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", context.user.id);
  if (error) return apiError("The evidence mapping could not be updated.", 503, "unavailable");
  await context.admin.from("assessment_versions").insert({ user_id: context.user.id, reason: "evidence-link-updated", input_hash: createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex"), summary: { requirement_id: parsed.data.requirementId, coverage: parsed.data.coverage, assessment_version: assessmentVersion } });
  return Response.json({ ok: true, assessmentVersion });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to unlink evidence.", 401, "unauthorised");
  const { id } = await params;
  const { data, error } = await context.admin
    .from("evidence_requirement_links")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select("requirement_id")
    .maybeSingle();
  if (error || !data) return apiError("The evidence link could not be removed.", 404, "not-found");
  await context.admin.from("assessment_versions").insert({
    user_id: context.user.id,
    reason: "evidence-link-removed",
    input_hash: `${id}:removed`,
    summary: { requirement_id: data.requirement_id },
  });
  return Response.json({ ok: true });
}
