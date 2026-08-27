import { NextResponse } from "next/server";
import { z } from "zod";

import {
  apiError,
  consumeRateLimit,
  databaseErrorIs,
  getMutationApiContext,
  parseJson,
} from "@/lib/api-context";

const issueSchema = z.object({
  opportunityId: z.string().uuid(),
  issueKind: z.enum(["incorrect", "stale", "closed", "conflicting", "other"]),
  detail: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in to report a source issue.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "source-issue-write", 10, 3600))) {
    return apiError("Too many source reports were submitted. Try again shortly.", 429, "rate-limited");
  }
  const parsed = issueSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the source report and try again.");
  const { data: publishedOpportunity } = await context.supabase
    .from("opportunities")
    .select("id")
    .eq("id", parsed.data.opportunityId)
    .eq("publication_state", "published")
    .maybeSingle();
  if (!publishedOpportunity) return apiError("That published opportunity is unavailable.", 404, "not-found");

  const { data, error } = await context.admin
    .from("source_issues")
    .insert({
      user_id: context.user.id,
      opportunity_id: parsed.data.opportunityId,
      issue_kind: parsed.data.issueKind,
      detail: parsed.data.detail,
    })
    .select("id,status")
    .single();
  if (databaseErrorIs(error, "relationship_invalid:published_source_issue_required")) {
    return apiError("That published opportunity is unavailable.", 404, "not-found");
  }
  if (error) return apiError("The source report could not be sent.", 503, "unavailable");
  await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "source_issue_reported",
    properties: { kind: parsed.data.issueKind },
  });
  return NextResponse.json({ issue: data }, { status: 201 });
}
