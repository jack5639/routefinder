import { NextResponse } from "next/server";
import Stripe from "stripe";

import { apiError, getMutationApiContext } from "@/lib/api-context";
import { launchApplicationCycle } from "@/lib/catalog/commercial/policy";
import { getServerEnv } from "@/lib/env";
import { checkoutMetadataSchema } from "@/lib/mvp/payment-fulfilment";
import { evaluatePaymentConfiguration } from "@/lib/payment-configuration";

export async function POST(request: Request) {
  const context = await getMutationApiContext(request);
  if (!context) return apiError("Sign in before purchasing Cycle.", 401, "unauthorised");

  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return apiError("Checkout has not been configured.", 503, "configuration-required");
  }
  const paymentConfiguration = evaluatePaymentConfiguration({
    enabled: env.PAYMENTS_ENABLED,
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    expectedLivemode: env.STRIPE_EXPECTED_LIVEMODE,
  });
  if (paymentConfiguration.state === "disabled") return apiError("Checkout is currently closed. Free remains available.", 503, "payments-disabled");
  if (!paymentConfiguration.checkoutReady || !env.STRIPE_SECRET_KEY) return apiError("Checkout has not been configured.", 503, "configuration-required");

  const { data: profile, error: profileError } = await context.supabase.from("profiles").select("application_cycle").eq("id", context.user.id).maybeSingle();
  if (profileError) return apiError("Checkout is temporarily unavailable.", 503, "database-unavailable");
  if (!profile?.application_cycle) return apiError("Complete your readiness check before purchasing Cycle.", 409, "profile-required");
  if (profile.application_cycle !== launchApplicationCycle) return apiError(`Cycle checkout currently supports ${launchApplicationCycle} entry only.`, 409, "unsupported-cycle");

  const { data: reservationRows, error: reservationError } = await context.admin.rpc("reserve_cycle_checkout", {
    p_user_id: context.user.id,
    p_application_cycle: profile.application_cycle,
  });
  if (reservationError || !Array.isArray(reservationRows) || reservationRows.length !== 1) {
    const rateLimited = reservationError?.message.includes("checkout_rate_limited");
    const alreadyActive = reservationError?.message.includes("checkout_already_active");
    return apiError(
      rateLimited ? "Please wait before starting another checkout." : alreadyActive ? "Cycle access is already active on this account." : "Checkout is temporarily unavailable.",
      rateLimited ? 429 : alreadyActive ? 409 : 503,
      rateLimited ? "rate-limited" : alreadyActive ? "already-active" : "database-unavailable",
    );
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
    custom_text: {
      submit: {
        message: "One payment with no automatic renewal. Access ends 30 September 2027. Routefinder supports 2027 entry in technology, engineering, business and finance; providers and employers decide outcomes. Routefinder does not submit applications. A parent or carer may pay but receives no access to the student workspace. Refund support: support@routefinder.app.",
      },
    },
    }, { idempotencyKey: reservation.reservation_id });
  } catch {
    return apiError("Checkout is temporarily unavailable.", 503, "stripe-unavailable");
  }
  if (session.livemode !== paymentConfiguration.livemode) return apiError("Checkout is temporarily unavailable.", 503, "stripe-environment-mismatch");

  const { error: analyticsError } = await context.admin.from("analytics_events").insert({
    user_id: context.user.id,
    event_name: "checkout_started",
    properties: { offer: reservation.offer },
  });
  if (analyticsError) return apiError("Checkout is temporarily unavailable.", 503, "database-unavailable");
  return NextResponse.json({ url: session.url });
}
