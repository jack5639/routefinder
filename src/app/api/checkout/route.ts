import { NextResponse } from "next/server";
import Stripe from "stripe";

import { apiError, getMutationApiContext } from "@/lib/api-context";
import { getServerEnv } from "@/lib/env";
import { checkoutMetadataSchema } from "@/lib/mvp/payment-fulfilment";

export async function POST() {
  const context = await getMutationApiContext();
  if (!context) return apiError("Sign in before purchasing Cycle.", 401, "unauthorised");

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return apiError("Checkout has not been configured.", 503, "configuration-required");
  }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || env.STRIPE_EXPECTED_LIVEMODE === undefined) return apiError("Checkout has not been configured.", 503, "configuration-required");

  const { data: profile, error: profileError } = await context.supabase.from("profiles").select("application_cycle").eq("id", context.user.id).maybeSingle();
  if (profileError) return apiError("Checkout is temporarily unavailable.", 503, "database-unavailable");
  if (!profile?.application_cycle) return apiError("Complete your readiness check before purchasing Cycle.", 409, "profile-required");

  const { data: reservationRows, error: reservationError } = await context.admin.rpc("reserve_cycle_checkout", {
    p_user_id: context.user.id,
    p_application_cycle: profile.application_cycle,
  });
  if (reservationError || !Array.isArray(reservationRows) || reservationRows.length !== 1) {
    const rateLimited = reservationError?.message.includes("checkout_rate_limited");
    return apiError(rateLimited ? "Please wait before starting another checkout." : "Checkout is temporarily unavailable.", rateLimited ? 429 : 503, rateLimited ? "rate-limited" : "database-unavailable");
  }
  const reservation = reservationRows[0] as { reservation_id: string; offer: "founding-launch" | "standard"; amount_pence: number; currency: "gbp"; expires_at: string };
  const metadata = checkoutMetadataSchema.parse({
    reservation_id: reservation.reservation_id,
    user_id: context.user.id,
    application_cycle: profile.application_cycle,
    offer: reservation.offer,
  });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: context.user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: reservation.amount_pence,
          product_data: {
            name: reservation.offer === "founding-launch" ? "Routefinder Cycle — founding launch" : "Routefinder Cycle",
            description: `Access until 30 September ${profile.application_cycle}`,
          },
        },
      },
    ],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/account?purchase=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?purchase=cancelled`,
    expires_at: Math.floor(new Date(reservation.expires_at).getTime() / 1000),
    metadata: { ...metadata, application_cycle: String(metadata.application_cycle) },
    payment_intent_data: {
      metadata: { ...metadata, application_cycle: String(metadata.application_cycle) },
    },
    }, { idempotencyKey: reservation.reservation_id });
  } catch {
    return apiError("Checkout is temporarily unavailable.", 503, "stripe-unavailable");
  }
  if (session.livemode !== (env.STRIPE_EXPECTED_LIVEMODE === "true")) return apiError("Checkout is temporarily unavailable.", 503, "stripe-environment-mismatch");

  const { error: analyticsError } = await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "checkout_started",
    properties: { offer: reservation.offer },
  });
  if (analyticsError) return apiError("Checkout is temporarily unavailable.", 503, "database-unavailable");
  return NextResponse.json({ url: session.url });
}
