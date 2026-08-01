import { describe, expect, it } from "vitest";
import { paymentStateForEvent, shouldApplyPaymentEvent } from "@/lib/mvp/payments";

describe("payment event ordering", () => {
  it("does not let an older completion override a newer refund", () => {
    expect(shouldApplyPaymentEvent(200, 100)).toBe(false);
    expect(shouldApplyPaymentEvent(100, 200)).toBe(true);
  });
  it("does not treat an equal second as newer without an event-id tie-breaker", () => {
    expect(shouldApplyPaymentEvent(200, 200)).toBe(false);
  });
  it("maps only entitlement-changing events", () => {
    expect(paymentStateForEvent("checkout.session.completed")).toBe("active");
    expect(paymentStateForEvent("charge.refunded")).toBe("refunded");
    expect(paymentStateForEvent("charge.dispute.created")).toBe("disputed");
    expect(paymentStateForEvent("payment_intent.created")).toBeNull();
  });
});
