import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  opportunityId: z.string().uuid(),
  decision: z.enum(["review", "published", "withdrawn"]),
  note: z.string().trim().min(3).max(1000),
});
const revisionSchema = z.object({ revisionId: z.string().uuid(), action: z.enum(["accept", "reject", "supersede", "withdraw"]), note: z.string().trim().min(3).max(1000) });

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const body = await parseJson(request);
  const revision = revisionSchema.safeParse(body);
  const parsed = reviewSchema.safeParse(body);
  if (!revision.success && !parsed.success) return apiError("Check the review decision.");
  const admin = createAdminClient();
  if (revision.success) {
    const result = await admin.rpc("review_catalogue_revision", {
      p_revision_id: revision.data.revisionId,
      p_reviewer_id: context.user.id,
      p_action: revision.data.action,
      p_note: revision.data.note,
    });
    if (result.error) return apiError("That revision could not be resolved; nothing was changed.", 409, "review-failed");
    return NextResponse.json({ resolved: true });
  }
  if (!parsed.success) return apiError("Check the review decision.");
  const result = await admin.rpc("review_catalogue_publication", {
    p_opportunity_id: parsed.data.opportunityId,
    p_reviewer_id: context.user.id,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note,
  });
  if (result.error) return apiError("Publication checks did not pass; nothing was changed.", 409, "review-incomplete");
  return NextResponse.json({ reviewed: true });
}
