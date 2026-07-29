import { NextResponse } from "next/server";
import Stripe from "stripe";

import { getServerEnv } from "@/lib/env";
import { cycleEndDate } from "@/lib/mvp/entitlements";
import { shouldApplyPaymentEvent } from "@/lib/mvp/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return NextResponse.json({ error: "Webhook configuration missing." }, { status: 503 });
  }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook configuration missing." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: prior } = await admin.from("stripe_events").select("id,processing_status").eq("id", event.id).maybeSingle();
  if (prior?.processing_status === "processed") return NextResponse.json({ received: true, duplicate: true });
  await admin.from("stripe_events").upsert({
    id: event.id,
    event_type: event.type,
    event_created_at: event.created,
    processing_status: "processing",
    error_code: null,
    updated_at: new Date().toISOString(),
  });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const applicationCycle = Number(session.metadata?.application_cycle);
      if (userId && Number.isInteger(applicationCycle)) {
        const { data: current } = await admin.from("entitlements").select("last_payment_event_created_at").eq("user_id", userId).maybeSingle();
        if (shouldApplyPaymentEvent(current?.last_payment_event_created_at, event.created)) {
          await admin.from("entitlements").upsert(
            {
              user_id: userId,
              plan: "cycle",
              status: "active",
              stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
              stripe_checkout_session_id: session.id,
              starts_at: new Date(event.created * 1000).toISOString(),
              ends_at: cycleEndDate(applicationCycle).toISOString(),
              last_payment_event_created_at: event.created,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        }
        await admin.from("orders").upsert({
          user_id: userId,
          stripe_checkout_session_id: session.id,
          amount_pence: session.amount_total ?? (session.metadata?.offer === "founding-launch" ? 2900 : 5900),
          currency: session.currency ?? "gbp",
          offer: session.metadata?.offer ?? "standard",
          status: "paid",
          purchased_at: new Date(event.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "stripe_checkout_session_id" });
        await admin.from("analytics_events").insert({
          user_id: userId,
          event_name: "checkout_completed",
          properties: { offer: session.metadata?.offer ?? "standard" },
        });
      }
    }

    if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
      const charge = event.data.object as Stripe.Charge;
      const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      const userId = charge.metadata?.user_id;
      const status = event.type === "charge.refunded" ? "refunded" : "disputed";
      let query = admin.from("entitlements").select("user_id,last_payment_event_created_at");
      query = userId ? query.eq("user_id", userId) : query.eq("stripe_customer_id", customerId ?? "");
      const { data: current } = await query.maybeSingle();
      if (current && shouldApplyPaymentEvent(current.last_payment_event_created_at, event.created)) {
        await admin.from("entitlements").update({
          status,
          last_payment_event_created_at: event.created,
          updated_at: new Date().toISOString(),
        }).eq("user_id", current.user_id);
        await admin.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("user_id", current.user_id);
      } else if (userId && !current) {
        await admin.from("entitlements").upsert({
          user_id: userId,
          plan: "cycle",
          status,
          stripe_customer_id: customerId,
          last_payment_event_created_at: event.created,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }
    await admin.from("stripe_events").update({ processing_status: "processed", processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("stripe_events").update({
      processing_status: "failed",
      error_code: error instanceof Error ? error.message.slice(0, 80) : "unknown",
      updated_at: new Date().toISOString(),
    }).eq("id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
