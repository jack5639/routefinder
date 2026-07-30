/**
 * End-to-end webhook verification against the isolated staging deployment.
 * It is intentionally opt-in: this test creates an auth user, reservation,
 * and payment projection in the configured staging project.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";

const baseUrl = process.env.PAYMENT_STAGING_BASE_URL;
const supabaseUrl = process.env.PAYMENT_STAGING_SUPABASE_URL;
const serviceKey = process.env.PAYMENT_STAGING_SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.PAYMENT_STAGING_STRIPE_WEBHOOK_SECRET;
const enabled = Boolean(baseUrl && supabaseUrl && serviceKey && webhookSecret);
const admin = enabled ? createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const createdUsers: string[] = [];

async function fixture() {
  const email = `stripe-integration-${randomUUID()}@example.test`;
  const { data, error } = await admin!.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("Could not create staging fixture user");
  createdUsers.push(data.user.id);
  const cycle = new Date().getUTCFullYear() + 1;
  const { error: profileError } = await admin!.from("profiles").insert({ id: data.user.id, application_cycle: cycle });
  if (profileError) throw profileError;
  const { data: rows, error: reservationError } = await admin!.rpc("reserve_cycle_checkout", { p_user_id: data.user.id, p_application_cycle: cycle });
  if (reservationError || !rows?.[0]) throw reservationError ?? new Error("Could not reserve test checkout");
  return { userId: data.user.id, cycle, reservation: rows[0] as { reservation_id: string; offer: string; amount_pence: number; currency: string } };
}

async function send(event: Record<string, unknown>) {
  const body = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret! });
  return fetch(`${baseUrl}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body });
}

afterEach(async () => {
  await Promise.all(createdUsers.splice(0).map((id) => admin!.auth.admin.deleteUser(id)));
});

describe.skipIf(!enabled)("Stripe test-mode staging fulfilment", () => {
  it("applies a paid event exactly once when delivered concurrently", async () => {
    const { userId, cycle, reservation } = await fixture();
    const event = {
      id: `evt_${randomUUID().replaceAll("-", "")}`, object: "event", type: "checkout.session.completed", created: 1_800_000_000, livemode: false,
      data: { object: { id: `cs_test_${randomUUID()}`, object: "checkout.session", payment_status: "paid", currency: reservation.currency, amount_total: reservation.amount_pence, payment_intent: `pi_test_${randomUUID()}`, metadata: { reservation_id: reservation.reservation_id, user_id: userId, application_cycle: String(cycle), offer: reservation.offer } } },
    };
    const responses = await Promise.all([send(event), send(event)]);
    expect(responses.every((response) => response.ok)).toBe(true);
    const { data: orders } = await admin!.from("orders").select("*").eq("user_id", userId);
    const { data: events } = await admin!.from("stripe_events").select("*").eq("id", event.id);
    expect(orders).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events?.[0]?.processing_status).toBe("processed");
  });

  it("rejects unpaid, wrong-currency, wrong-amount, and missing-account sessions without an entitlement", async () => {
    const { userId, cycle, reservation } = await fixture();
    const invalids = [
      { payment_status: "unpaid" }, { currency: "usd" }, { amount_total: reservation.amount_pence + 1 }, { metadata: { reservation_id: reservation.reservation_id, user_id: randomUUID(), application_cycle: String(cycle), offer: reservation.offer } },
    ];
    for (const override of invalids) {
      const event = { id: `evt_${randomUUID().replaceAll("-", "")}`, object: "event", type: "checkout.session.completed", created: 1_800_000_001, livemode: false,
        data: { object: { id: `cs_test_${randomUUID()}`, object: "checkout.session", payment_status: "paid", currency: reservation.currency, amount_total: reservation.amount_pence, metadata: { reservation_id: reservation.reservation_id, user_id: userId, application_cycle: String(cycle), offer: reservation.offer }, ...override } } };
      expect((await send(event)).status).toBeGreaterThanOrEqual(400);
    }
    const { data } = await admin!.from("entitlements").select("*").eq("user_id", userId);
    expect(data).toHaveLength(0);
  });
});
