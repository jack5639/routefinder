import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, getApiContext, parseJson } from "@/lib/api-context";

const issueSchema = z.object({
  opportunityId: z.string().uuid(),
  issueKind: z.enum(["incorrect", "stale", "closed", "conflicting", "other"]),
  detail: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const context = await getApiContext();
  if (!context) return apiError("Sign in to report a source issue.", 401, "unauthorised");
  const parsed = issueSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Check the source report and try again.");
  const { data, error } = await context.supabase
    .from("source_issues")
    .insert({
      user_id: context.user.id,
      opportunity_id: parsed.data.opportunityId,
      issue_kind: parsed.data.issueKind,
      detail: parsed.data.detail,
    })
    .select("id,status")
    .single();
  if (error) return apiError("The source report could not be sent.", 503, "unavailable");
  await context.supabase.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "source_issue_reported",
    properties: { kind: parsed.data.issueKind },
  });
  return NextResponse.json({ issue: data }, { status: 201 });
}
