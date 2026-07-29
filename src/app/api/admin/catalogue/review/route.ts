import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  opportunityId: z.string().uuid(),
  decision: z.enum(["review", "published", "withdrawn"]),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const parsed = reviewSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the review decision.");
  const admin = createAdminClient();
  const { data: opportunity } = await admin.from("opportunities").select("*, requirements(*)").eq("id", parsed.data.opportunityId).single();
  if (!opportunity) return apiError("Opportunity not found.", 404, "not-found");
  if (parsed.data.decision === "published") {
    const requirements = opportunity.requirements ?? [];
    const unsafe = !opportunity.verified_at || opportunity.freshness === "needs-checking" || requirements.length === 0 || requirements.some((item: { conflict: boolean; publication_state: string; verified_at?: string }) => item.conflict || item.publication_state !== "published" || !item.verified_at);
    if (unsafe) return apiError("Verify the opportunity and every requirement before publishing.", 409, "review-incomplete");
  }
  await admin.from("opportunities").update({ publication_state: parsed.data.decision, updated_at: new Date().toISOString() }).eq("id", parsed.data.opportunityId);
  await admin.from("publication_reviews").insert({
    opportunity_id: parsed.data.opportunityId,
    reviewer_id: context.user.id,
    decision: parsed.data.decision,
    note: parsed.data.note,
  });
  return NextResponse.json({ reviewed: true });
}
