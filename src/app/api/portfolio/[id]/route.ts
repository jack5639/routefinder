import { apiError, getMutationApiContext } from "@/lib/api-context";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to update your portfolio.", 401, "unauthorised");

  const { id } = await params;
  const { data, error } = await context.admin
    .from("portfolio_items")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();

  if (error) return apiError("The portfolio item could not be removed.", 503, "unavailable");
  if (!data) return apiError("That portfolio item was not found.", 404, "not-found");
  return Response.json({ ok: true });
}
