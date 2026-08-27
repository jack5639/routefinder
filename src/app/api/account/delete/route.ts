import { NextResponse } from "next/server";

import { apiError, getMutationApiContext, parseJson } from "@/lib/api-context";
import { recordDeletion } from "@/lib/deletion-ledger";
import { z } from "zod";

const deleteSchema = z.object({ confirmation: z.literal("DELETE") });

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to delete your account.", 401, "unauthorised");
  const parsed = deleteSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Type DELETE to confirm account deletion.");

  // The operational audit is required evidence and must exist before the
  // destructive auth operation. Product analytics remains best effort.
  const audit = await context.admin.from("audit_events").insert({
    user_id: context.user.id,
    action: "account.deletion_requested",
    entity_type: "user",
    entity_id: context.user.id,
    metadata: {},
  });
  if (audit.error) {
    return apiError("Account deletion is temporarily unavailable. Contact support if this continues.", 503, "unavailable");
  }

  // This must be durably acknowledged outside the database backup boundary
  // before removing the Auth user. If it is unavailable, deletion fails closed.
  try {
    await recordDeletion(context.user.id);
  } catch {
    return apiError("Account deletion is temporarily unavailable. Contact support if this continues.", 503, "unavailable");
  }

  await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "deletion_requested",
    properties: {},
  });

  try {
    const { error } = await context.admin.auth.admin.deleteUser(context.user.id);
    if (error) throw error;
  } catch {
    return apiError("Account deletion is temporarily unavailable. Contact support if this continues.", 503, "unavailable");
  }

  return NextResponse.json({ deleted: true });
}
