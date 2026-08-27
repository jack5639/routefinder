import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseJson } from "@/lib/api-context";
import { isSameOriginRequest } from "@/lib/same-origin";
import { normalisePostLoginPath } from "@/lib/auth/return-path";
import { campaignCodeSchema, normaliseCampaignCode } from "@/lib/campaign";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  email: z.string().email().max(320),
  nextPath: z.unknown().optional(),
  campaign: campaignCodeSchema.optional(),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return apiError("Cross-origin requests are not allowed.", 403, "cross-origin");
  const parsed = requestSchema.safeParse(await parseJson(request));
  if (!parsed.success) return apiError("Enter a valid email address.");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = createHash("sha256").update(forwarded).digest("hex").slice(0, 24);
  try {
    const admin = createAdminClient();
    const { data: allowed, error: limitError } = await admin.rpc("consume_rate_limit", {
      bucket_key: `auth-magic-link:${key}`,
      maximum: 5,
      window_seconds: 3600,
    });
    if (limitError || allowed === false) return apiError("Too many sign-in emails. Try again later.", 429, "rate-limited");
  } catch {
    return apiError("Account services are not configured in this environment.", 503, "configuration-required");
  }

  const supabase = await createClient();
  if (!supabase) return apiError("Account services are not configured in this environment.", 503, "configuration-required");
  const origin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin;
  const nextPath = normalisePostLoginPath(parsed.data.nextPath);
  const campaign = normaliseCampaignCode(parsed.data.campaign);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}${campaign ? `&campaign=${encodeURIComponent(campaign)}` : ""}`;
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });
  if (error) return apiError("A sign-in link could not be sent. Try again shortly.", 503, "auth-unavailable");
  return NextResponse.json({ sent: true });
}
