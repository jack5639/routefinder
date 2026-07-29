import { NextResponse } from "next/server";
import Stripe from "stripe";

import { apiError, getApiContext } from "@/lib/api-context";
import { getServerEnv } from "@/lib/env";

export async function POST() {
  const context = await getApiContext();
  if (!context) return apiError("Sign in before purchasing Cycle.", 401, "unauthorised");

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return apiError("Checkout has not been configured.", 503, "configuration-required");
  }
  if (!env.STRIPE_SECRET_KEY) return apiError("Checkout has not been configured.", 503, "configuration-required");

  const { data: profile } = await context.supabase.from("profiles").select("application_cycle").eq("id", context.user.id).maybeSingle();
  if (!profile?.application_cycle) return apiError("Complete your readiness check before purchasing Cycle.", 409, "profile-required");

  const admin = (await import("@/lib/supabase/admin")).createAdminClient();
  const { count } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("offer", "founding-launch");
  const founding = (count ?? 0) < 50;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: context.user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: founding ? 2900 : 5900,
          product_data: {
            name: founding ? "Routefinder Cycle — founding launch" : "Routefinder Cycle",
            description: `Access until 30 September ${profile.application_cycle}`,
          },
        },
      },
    ],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/account?purchase=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?purchase=cancelled`,
    metadata: {
      user_id: context.user.id,
      application_cycle: String(profile.application_cycle),
      offer: founding ? "founding-launch" : "standard",
    },
    payment_intent_data: {
      metadata: {
        user_id: context.user.id,
        application_cycle: String(profile.application_cycle),
        offer: founding ? "founding-launch" : "standard",
      },
    },
  });

  await context.supabase.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "checkout_started",
    properties: { offer: founding ? "founding-launch" : "standard" },
  });
  return NextResponse.json({ url: session.url });
}
