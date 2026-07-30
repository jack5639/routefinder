import { apiError, getMutationApiContext } from "@/lib/api-context";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in to update your portfolio.", 401, "unauthorised");

  const { id } = await params;
  const { error } = await context.admin.from("portfolio_items").delete().eq("id", id).eq("user_id", context.user.id);

  return error ? apiError("The portfolio item could not be removed.", 503, "unavailable") : Response.json({ ok: true });
}
