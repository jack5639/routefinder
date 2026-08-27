import { describe, expect, it } from "vitest";

import { evaluatePaymentConfiguration } from "./payment-configuration";

const completeTest = {
  enabled: true,
  secretKey: "sk_test_example",
  webhookSecret: "whsec_example",
  expectedLivemode: "false" as const,
};

describe("payment configuration", () => {
  it("keeps checkout disabled even when Stripe credentials exist", () => {
    expect(evaluatePaymentConfiguration({ ...completeTest, enabled: false })).toEqual({
      state: "disabled", checkoutReady: false, livemode: null,
    });
  });

  it("fails closed for partial configuration", () => {
    expect(evaluatePaymentConfiguration({ enabled: true, secretKey: "sk_test_example" }).state).toBe("partial");
  });

  it("accepts explicitly enabled test mode", () => {
    expect(evaluatePaymentConfiguration(completeTest)).toEqual({ state: "ready", checkoutReady: true, livemode: false });
  });

  it("rejects a live/test mismatch", () => {
    expect(evaluatePaymentConfiguration({ ...completeTest, expectedLivemode: "true" }).state).toBe("environment-mismatch");
  });

  it("accepts explicitly enabled live mode only with a live key", () => {
    expect(evaluatePaymentConfiguration({ ...completeTest, secretKey: "sk_live_example", expectedLivemode: "true" })).toEqual({
      state: "ready", checkoutReady: true, livemode: true,
    });
  });
});
