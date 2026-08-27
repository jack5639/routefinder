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
const cronSecret = process.env.PAYMENT_STAGING_CRON_SECRET;
const enabled = Boolean(baseUrl && supabaseUrl && serviceKey && webhookSecret);
const admin = enabled ? createClient(supabaseUrl!, serviceKey!, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const createdUsers: string[] = [];

type Fixture = Awaited<ReturnType<typeof fixture>>;

const eventTime = 1_800_000_000;

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

function checkoutEvent(data: Fixture, options: { created?: number; paymentIntent?: string; sessionId?: string } = {}) {
  const paymentIntent = options.paymentIntent ?? `pi_test_${randomUUID()}`;
  const sessionId = options.sessionId ?? `cs_test_${randomUUID()}`;
  return {
    event: {
      id: `evt_${randomUUID().replaceAll("-", "")}`, object: "event", type: "checkout.session.completed", created: options.created ?? eventTime, livemode: false,
      data: { object: { id: sessionId, object: "checkout.session", status: "complete", payment_status: "paid", currency: data.reservation.currency, amount_total: data.reservation.amount_pence, payment_intent: paymentIntent, metadata: { reservation_id: data.reservation.reservation_id, user_id: data.userId, application_cycle: String(data.cycle), offer: data.reservation.offer } } },
    },
    paymentIntent,
    sessionId,
  };
}

function terminalEvent(options: { type: "charge.refunded" | "charge.dispute.created" | "charge.dispute.closed"; created: number; paymentIntent: string; chargeId?: string; amountRefunded?: number; disputeStatus?: string }) {
  const chargeId = options.chargeId ?? `ch_test_${randomUUID()}`;
  const object = options.type === "charge.refunded"
    ? { id: chargeId, object: "charge", amount: 5900, amount_refunded: options.amountRefunded ?? 0, payment_intent: options.paymentIntent }
    : { id: `dp_test_${randomUUID()}`, object: "dispute", charge: chargeId, status: options.disputeStatus ?? "needs_response" };
  return {
    id: `evt_${randomUUID().replaceAll("-", "")}`, object: "event", type: options.type, created: options.created, livemode: false,
    data: { object },
  };
}

async function entitlementFor(userId: string) {
  const { data, error } = await admin!.from("entitlements").select("*").eq("user_id", userId);
  if (error) throw error;
  return data?.[0];
}

async function orderFor(userId: string) {
  const { data, error } = await admin!.from("orders").select("*").eq("user_id", userId);
  if (error) throw error;
  return data?.[0];
}

afterEach(async () => {
  if (admin) await Promise.all(createdUsers.splice(0).map((id) => admin.auth.admin.deleteUser(id)));
});

describe("Stripe test-mode staging fulfilment", () => {
  it("requires an explicit isolated staging configuration", () => {
    expect(enabled, "Set every PAYMENT_STAGING_* value before running this release gate.").toBe(true);
  });

  describe.skipIf(!enabled)("configured staging checks", () => {
  it("applies a paid event exactly once when delivered concurrently", async () => {
    const data = await fixture();
    const { event } = checkoutEvent(data);
    const responses = await Promise.all([send(event), send(event)]);
    expect(responses.every((response) => response.ok)).toBe(true);
    const { data: orders } = await admin!.from("orders").select("*").eq("user_id", data.userId);
    const { data: events } = await admin!.from("stripe_events").select("*").eq("id", event.id);
    expect(orders).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events?.[0]?.processing_status).toBe("processed");
  });

  it("rejects unpaid, wrong-currency, wrong-amount, and missing-account sessions without an entitlement", async () => {
    const data = await fixture();
    const invalids = [
      { payment_status: "unpaid" }, { currency: "usd" }, { amount_total: data.reservation.amount_pence + 1 }, { metadata: { reservation_id: data.reservation.reservation_id, user_id: randomUUID(), application_cycle: String(data.cycle), offer: data.reservation.offer } },
    ];
    for (const override of invalids) {
      const { event } = checkoutEvent(data, { created: eventTime + 1 });
      event.data.object = { ...event.data.object, ...override };
      expect((await send(event)).status).toBeGreaterThanOrEqual(400);
    }
    expect(await entitlementFor(data.userId)).toBeUndefined();
  });

  it("ends Cycle access after a full refund", async () => {
    const data = await fixture();
    const completed = checkoutEvent(data);
    expect((await send(completed.event)).ok).toBe(true);
    const refund = terminalEvent({ type: "charge.refunded", created: eventTime + 1, paymentIntent: completed.paymentIntent, amountRefunded: data.reservation.amount_pence });
    expect((await send(refund)).ok).toBe(true);
    expect(await entitlementFor(data.userId)).toMatchObject({ plan: "cycle", status: "refunded", last_payment_event_type: "charge.refunded" });
    expect(await orderFor(data.userId)).toMatchObject({ status: "refunded", refunded_amount_pence: data.reservation.amount_pence });
  });

  it("moves Cycle to payment review after a partial refund", async () => {
    const data = await fixture();
    const completed = checkoutEvent(data);
    expect((await send(completed.event)).ok).toBe(true);
    const amountRefunded = Math.floor(data.reservation.amount_pence / 2);
    const refund = terminalEvent({ type: "charge.refunded", created: eventTime + 1, paymentIntent: completed.paymentIntent, amountRefunded });
    expect((await send(refund)).ok).toBe(true);
    expect(await entitlementFor(data.userId)).toMatchObject({ plan: "cycle", status: "payment_review", last_payment_event_type: "charge.refunded" });
    expect(await orderFor(data.userId)).toMatchObject({ status: "partially_refunded", refunded_amount_pence: amountRefunded });
  });

  it("removes access for dispute creation and does not restore it when the dispute is won", async () => {
    const data = await fixture();
    const completed = checkoutEvent(data);
    expect((await send(completed.event)).ok).toBe(true);
    const chargeId = `ch_test_${randomUUID()}`;
    const created = terminalEvent({ type: "charge.dispute.created", created: eventTime + 1, paymentIntent: completed.paymentIntent, chargeId });
    expect((await send(created)).ok).toBe(true);
    expect(await entitlementFor(data.userId)).toMatchObject({ status: "disputed", last_payment_event_type: "charge.dispute.created" });
    const closed = terminalEvent({ type: "charge.dispute.closed", created: eventTime + 2, paymentIntent: completed.paymentIntent, chargeId, disputeStatus: "won" });
    expect((await send(closed)).ok).toBe(true);
    expect(await entitlementFor(data.userId)).toMatchObject({ status: "disputed", last_payment_event_type: "charge.dispute.closed" });
    expect(await orderFor(data.userId)).toMatchObject({ status: "disputed" });
  });

  it("keeps a terminal event when it is delivered before an older completion", async () => {
    const data = await fixture();
    const completed = checkoutEvent(data, { created: eventTime });
    const terminal = terminalEvent({ type: "charge.dispute.created", created: eventTime + 1, paymentIntent: completed.paymentIntent });
    expect((await send(terminal)).status).toBeGreaterThanOrEqual(500);
    expect((await send(completed.event)).ok).toBe(true);
    expect((await send(terminal)).ok).toBe(true);
    expect(await entitlementFor(data.userId)).toMatchObject({ status: "disputed", last_payment_event_type: "charge.dispute.created" });
  });

  it("gives the terminal event precedence for equal Stripe timestamps", async () => {
    const first = await fixture();
    const firstCompleted = checkoutEvent(first, { created: eventTime + 10 });
    expect((await send(firstCompleted.event)).ok).toBe(true);
    const firstRefund = terminalEvent({ type: "charge.refunded", created: eventTime + 10, paymentIntent: firstCompleted.paymentIntent, amountRefunded: first.reservation.amount_pence });
    expect((await send(firstRefund)).ok).toBe(true);
    expect(await entitlementFor(first.userId)).toMatchObject({ status: "refunded", last_payment_event_type: "charge.refunded" });

    const second = await fixture();
    const secondCompleted = checkoutEvent(second, { created: eventTime + 20 });
    const secondDispute = terminalEvent({ type: "charge.dispute.created", created: eventTime + 20, paymentIntent: secondCompleted.paymentIntent });
    expect((await send(secondDispute)).status).toBeGreaterThanOrEqual(500);
    expect((await send(secondCompleted.event)).ok).toBe(true);
    expect((await send(secondDispute)).ok).toBe(true);
    expect(await entitlementFor(second.userId)).toMatchObject({ status: "disputed", last_payment_event_type: "charge.dispute.created" });
  });

  it("retries a webhook after a temporary projection failure", async () => {
    const data = await fixture();
    const completed = checkoutEvent(data, { created: eventTime + 30 });
    const refund = terminalEvent({ type: "charge.refunded", created: eventTime + 31, paymentIntent: completed.paymentIntent, amountRefunded: data.reservation.amount_pence });
    expect((await send(refund)).status).toBeGreaterThanOrEqual(500);
    const { data: failed } = await admin!.from("stripe_events").select("processing_status,error_code").eq("id", refund.id).single();
    expect(failed).toMatchObject({ processing_status: "failed", error_code: "projection_failed" });
    expect((await send(completed.event)).ok).toBe(true);
    expect((await send(refund)).ok).toBe(true);
    const { data: processed } = await admin!.from("stripe_events").select("processing_status,error_code").eq("id", refund.id).single();
    expect(processed).toMatchObject({ processing_status: "processed", error_code: null });
    expect(await entitlementFor(data.userId)).toMatchObject({ status: "refunded" });
  });

  it("expires an ended Cycle entitlement", async () => {
    expect(cronSecret, "Set PAYMENT_STAGING_CRON_SECRET for the expiry check.").toBeTruthy();
    const data = await fixture();
    const completed = checkoutEvent(data, { created: eventTime + 40 });
    expect((await send(completed.event)).ok).toBe(true);
    const { error: updateError } = await admin!.from("entitlements").update({ ends_at: new Date(Date.now() - 60_000).toISOString() }).eq("user_id", data.userId);
    expect(updateError).toBeNull();
    const response = await fetch(`${baseUrl}/api/cron/expiry`, { headers: { authorization: `Bearer ${cronSecret}` } });
    expect(response.ok).toBe(true);
    expect(await entitlementFor(data.userId)).toMatchObject({ status: "expired" });
  });
  });
});
