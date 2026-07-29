import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { evidenceSchema } from "@/lib/mvp/schemas";
import { z } from "zod";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to update evidence.", 401, "unauthorised");

  const parsed = evidenceSchema.partial().extend({ archived: z.boolean().optional() }).safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the evidence changes.");
  const { id } = await params;
  const patch = parsed.data;
  const { error } = await context.supabase
    .from("evidence_items")
    .update({
      ...(patch.evidenceType !== undefined ? { evidence_type: patch.evidenceType } : {}),
      ...(patch.happened !== undefined ? { happened: patch.happened } : {}),
      ...(patch.contribution !== undefined ? { contribution: patch.contribution } : {}),
      ...(patch.outcome !== undefined ? { outcome: patch.outcome } : {}),
      ...(patch.learned !== undefined ? { learned: patch.learned } : {}),
      ...(patch.supportingDetail !== undefined ? { supporting_detail: patch.supportingDetail || null } : {}),
      ...(patch.evidenceDate !== undefined ? { evidence_date: patch.evidenceDate || null } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.user.id);

  return error ? apiError("Evidence could not be updated.", 503, "unavailable") : Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to remove evidence.", 401, "unauthorised");
  const { id } = await params;
  const { error } = await context.supabase.from("evidence_items").delete().eq("id", id).eq("user_id", context.user.id);
  return error ? apiError("Evidence could not be removed.", 503, "unavailable") : Response.json({ ok: true });
}
