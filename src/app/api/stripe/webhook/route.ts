import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getServerEnv } from "@/lib/env";
import { checkoutSessionIsPaid, isExpectedStripeMode } from "@/lib/mvp/payment-fulfilment";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function reject(admin: ReturnType<typeof createAdminClient>, event: Stripe.Event, code: string) {
  const { error } = await admin.rpc("fail_stripe_payment_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created_at: event.created,
    p_error_code: code,
  });
  return error ? NextResponse.json({ error: "Webhook processing failed." }, { status: 500 }) : NextResponse.json({ error: "Webhook validation failed." }, { status: 400 });
}

async function fail(admin: ReturnType<typeof createAdminClient>, event: Stripe.Event, code: string) {
  const { error } = await admin.rpc("fail_stripe_payment_event", {
    p_event_id: event.id,
    p_event_type: event.type,
    p_event_created_at: event.created,
    p_error_code: code,
  });
  return error;
}

function identifier(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export async function POST(request: Request) {
  let env: ReturnType<typeof getServerEnv>;
  try { env = getServerEnv(); } catch { return NextResponse.json({ error: "Webhook configuration missing." }, { status: 503 }); }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || env.STRIPE_EXPECTED_LIVEMODE === undefined) {
    return NextResponse.json({ error: "Webhook configuration missing." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(env.STRIPE_SECRET_KEY).webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET);
  } catch { return NextResponse.json({ error: "Invalid signature." }, { status: 400 }); }

  const admin = createAdminClient();
  if (!isExpectedStripeMode(event.livemode, env.STRIPE_EXPECTED_LIVEMODE === "true")) return reject(admin, event, "unexpected_stripe_environment");

  let args: Record<string, unknown>;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paid = checkoutSessionIsPaid({
      status: session.status,
      paymentStatus: session.payment_status,
      currency: session.currency,
      amountTotal: session.amount_total,
      metadata: session.metadata,
    });
    if (!paid.ok) return reject(admin, event, paid.code);
    args = {
      // The signature and explicit environment check above establish this;
      // the RPC receives only the validated-environment marker.
      p_event_id: event.id, p_event_type: event.type, p_event_created_at: event.created, p_live_mode: true,
      p_reservation_id: paid.metadata.reservation_id, p_user_id: paid.metadata.user_id,
      p_application_cycle: paid.metadata.application_cycle, p_offer: paid.metadata.offer,
      p_amount_pence: session.amount_total, p_currency: session.currency?.toLowerCase(),
      p_checkout_session_id: session.id, p_payment_intent_id: identifier(session.payment_intent),
    };
  } else if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    args = {
      p_event_id: event.id, p_event_type: event.type, p_event_created_at: event.created, p_live_mode: true,
      p_charge_id: charge.id, p_payment_intent_id: identifier(charge.payment_intent), p_refunded_amount_pence: charge.amount_refunded,
    };
  } else if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    args = {
      p_event_id: event.id, p_event_type: event.type, p_event_created_at: event.created, p_live_mode: true,
      p_charge_id: identifier(dispute.charge), p_dispute_status: dispute.status,
    };
  } else {
    return reject(admin, event, "unsupported_event");
  }

  const { data, error } = await admin.rpc("apply_stripe_payment_event", args);
  if (error || (data !== "processed" && data !== "duplicate")) {
    // This is deliberately a separate, minimal transaction. The projection
    // RPC has rolled back, while this leaves an operator-visible retryable
    // marker. Stripe still receives a non-2xx response and retries.
    const failureRecordError = await fail(admin, event, "projection_failed");
    if (failureRecordError) return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
  return NextResponse.json({ received: true, duplicate: data === "duplicate" });
}
