import { describe, expect, it } from "vitest";

import { checkoutSessionIsPaid, isExpectedStripeMode, isNewerPaymentEvent } from "@/lib/mvp/payment-fulfilment";

const metadata = {
  reservation_id: "f4a64c27-7a1b-4a57-bc07-9a3dd31a1c7f",
  user_id: "7fd1b44e-b7b2-4254-b615-7aa1e50d9c7c",
  application_cycle: "2027",
  offer: "founding-launch",
};

describe("Stripe fulfilment validation", () => {
  it("accepts only a paid session with the reservation's expected GBP amount", () => {
    expect(checkoutSessionIsPaid({ status: "complete", paymentStatus: "paid", currency: "gbp", amountTotal: 2900, metadata }).ok).toBe(true);
    expect(checkoutSessionIsPaid({ status: "open", paymentStatus: "paid", currency: "gbp", amountTotal: 2900, metadata })).toMatchObject({ code: "checkout_not_complete" });
    expect(checkoutSessionIsPaid({ status: "complete", paymentStatus: "unpaid", currency: "gbp", amountTotal: 2900, metadata })).toMatchObject({ code: "payment_not_paid" });
    expect(checkoutSessionIsPaid({ status: "complete", paymentStatus: "paid", currency: "usd", amountTotal: 2900, metadata })).toMatchObject({ code: "unexpected_currency" });
    expect(checkoutSessionIsPaid({ status: "complete", paymentStatus: "paid", currency: "gbp", amountTotal: 0, metadata })).toMatchObject({ code: "invalid_amount" });
    expect(checkoutSessionIsPaid({ status: "complete", paymentStatus: "paid", currency: "gbp", amountTotal: 2900, metadata: {} })).toMatchObject({ code: "invalid_metadata" });
  });

  it("requires the configured Stripe environment", () => {
    expect(isExpectedStripeMode(false, false)).toBe(true);
    expect(isExpectedStripeMode(true, false)).toBe(false);
  });

  it("resolves same-second ambiguity conservatively", () => {
    expect(isNewerPaymentEvent({ createdAt: 100, id: "evt_a", type: "charge.refunded" }, { createdAt: 100, id: "evt_b", type: "checkout.session.completed" })).toBe(false);
    expect(isNewerPaymentEvent({ createdAt: 100, id: "evt_a", type: "checkout.session.completed" }, { createdAt: 100, id: "evt_b", type: "charge.refunded" })).toBe(true);
    expect(isNewerPaymentEvent({ createdAt: 100, id: "evt_a", type: "charge.refunded" }, { createdAt: 100, id: "evt_b", type: "charge.dispute.created" })).toBe(false);
  });
});
