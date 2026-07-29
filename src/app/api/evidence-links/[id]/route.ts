import { apiError, getApiContext } from "@/lib/api-context";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to unlink evidence.", 401, "unauthorised");
  const { id } = await params;
  const { data, error } = await context.supabase
    .from("evidence_requirement_links")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select("requirement_id")
    .maybeSingle();
  if (error || !data) return apiError("The evidence link could not be removed.", 404, "not-found");
  await context.supabase.from("assessment_versions").insert({
    user_id: context.user.id,
    reason: "evidence-link-removed",
    input_hash: `${id}:removed`,
    summary: { requirement_id: data.requirement_id },
  });
  return Response.json({ ok: true });
}
