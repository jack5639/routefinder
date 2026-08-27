import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseJson } from "@/lib/api-context";
import { campaignCodeSchema } from "@/lib/campaign";
import { isSameOriginRequest } from "@/lib/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";

const pathSchema = z.enum(["focused", "comparing", "unsure"]);
const eventSchema = z.discriminatedUnion("eventName", [
  z.object({
    eventName: z.literal("starting_path_selected"),
    properties: z.object({ path: pathSchema, campaign: campaignCodeSchema.optional() }).strict(),
  }),
  z.object({
    eventName: z.literal("first_useful_result_viewed"),
    properties: z.object({ path: pathSchema, campaign: campaignCodeSchema.optional() }).strict(),
  }),
  z.object({
    eventName: z.literal("paywall_viewed"),
    properties: z.object({ campaign: campaignCodeSchema.optional() }).strict(),
  }),
]);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiError("Cross-origin requests are not allowed.", 403, "cross-origin");
  const parsed = eventSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("That funnel event is not valid.");

  try {
    const admin = createAdminClient();
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = createHash("sha256").update(forwarded).digest("hex").slice(0, 24);
    const { data: allowed, error: rateLimitError } = await admin.rpc("consume_rate_limit", {
      bucket_key: `public-funnel:${key}`,
      maximum: 60,
      window_seconds: 3600,
    });
    if (rateLimitError || allowed === false) return apiError("Too many events. Try again later.", 429, "rate-limited");

    const { error } = await admin.from("analytics_events").insert({
      user_id: null,
      event_name: parsed.data.eventName,
      properties: parsed.data.properties,
    });
    if (error) return apiError("Analytics is temporarily unavailable.", 503, "unavailable");
    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    return apiError("Analytics is not configured in this environment.", 503, "configuration-required");
  }
}
