import { NextResponse } from "next/server";

import { apiError, consumeRateLimit, getMutationApiContext, parseJson } from "@/lib/api-context";
import { analyticsSchema } from "@/lib/mvp/schemas";

export async function POST(request: Request) {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in before recording this event.", 401, "unauthorised");
  if (!(await consumeRateLimit(context, "analytics-write", 120, 3600))) {
    return apiError("Too many events were submitted. Try again shortly.", 429, "rate-limited");
  }
  const parsed = analyticsSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("This analytics event is not allowed.");
  const { error } = await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: parsed.data.eventName,
    properties: parsed.data.properties,
  });
  if (error) return apiError("The event could not be recorded.", 503, "unavailable");
  return new NextResponse(null, { status: 204 });
}
