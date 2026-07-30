import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  opportunityId: z.string().uuid(),
  decision: z.enum(["review", "published", "withdrawn"]),
  note: z.string().trim().max(1000).optional(),
});
const revisionSchema = z.object({ revisionId: z.string().uuid(), action: z.enum(["accept", "reject", "withdraw"]), note: z.string().trim().min(3).max(1000) });

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context || !isAdminEmail(context.user.email)) return apiError("Admin access required.", 403, "forbidden");
  const body = await parseJson(request);
  const revision = revisionSchema.safeParse(body);
  const parsed = reviewSchema.safeParse(body);
  if (!revision.success && !parsed.success) return apiError("Check the review decision.");
  const admin = createAdminClient();
  if (revision.success) {
    const { data: item } = await admin.from("catalogue_fact_revisions").select("*").eq("id", revision.data.revisionId).single();
    if (!item || item.status !== "pending") return apiError("That pending revision is unavailable.", 404, "not-found");
    if (revision.data.action === "accept") await admin.from("opportunities").update({ ...(item.proposed_fact as object), freshness: "high", verified_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", item.opportunity_id);
    await admin.from("catalogue_fact_revisions").update({ status: revision.data.action === "accept" ? "accepted" : revision.data.action === "reject" ? "rejected" : "withdrawn", reviewer_id: context.user.id, reviewer_note: revision.data.note, reviewed_at: new Date().toISOString() }).eq("id", item.id);
    await admin.from("audit_events").insert({ user_id: context.user.id, action: "catalogue.revision_resolved", entity_type: "catalogue_fact_revision", entity_id: item.id, metadata: { action: revision.data.action } });
    return NextResponse.json({ resolved: true });
  }
  if (!parsed.success) return apiError("Check the review decision.");
  const { data: opportunity } = await admin.from("opportunities").select("*, requirements(*)").eq("id", parsed.data.opportunityId).single();
  if (!opportunity) return apiError("Opportunity not found.", 404, "not-found");
  if (parsed.data.decision === "published") {
    const requirements = opportunity.requirements ?? [];
    const approved = opportunity.source_authority === "find-an-apprenticeship-api-v2" ? process.env.APPRENTICESHIP_SOURCE_APPROVAL_REFERENCE : opportunity.source_authority === "discover-uni-hesa" ? process.env.DISCOVER_UNI_SOURCE_APPROVAL_REFERENCE : true;
    const unsafe = !approved || opportunity.sector === "unclassified" || !opportunity.verified_at || opportunity.freshness === "needs-checking" || requirements.length === 0 || requirements.some((item: { conflict: boolean; publication_state: string; verified_at?: string }) => item.conflict || item.publication_state !== "published" || !item.verified_at);
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
