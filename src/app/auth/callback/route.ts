import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { normalisePostLoginPath } from "@/lib/auth/return-path";
import { normaliseCampaignCode } from "@/lib/campaign";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set(["signup", "invite", "magiclink", "recovery", "email_change", "email"]);

async function recordCampaignAttribution(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, campaign?: string) {
  if (!campaign) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await createAdminClient().from("analytics_events").insert({
      user_id: user.id,
      event_name: "campaign_attributed",
      properties: { campaign },
    });
  } catch {
    // Attribution is best effort and must never block authentication.
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextPath = normalisePostLoginPath(url.searchParams.get("next"));
  const campaign = normaliseCampaignCode(url.searchParams.get("campaign"));
  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await recordCampaignAttribution(supabase, campaign);
      return NextResponse.redirect(new URL(nextPath, url.origin));
    }
  }

  if (tokenHash && type && emailOtpTypes.has(type) && supabase) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });

    if (!error) {
      await recordCampaignAttribution(supabase, campaign);
      return NextResponse.redirect(new URL(nextPath, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/signin?error=expired-link", url.origin));
}
