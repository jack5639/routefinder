export type PaymentConfigurationState = "disabled" | "partial" | "environment-mismatch" | "ready";

export interface PaymentConfigurationInput {
  enabled: boolean;
  secretKey?: string;
  webhookSecret?: string;
  expectedLivemode?: "true" | "false";
}

export interface PaymentConfiguration {
  state: PaymentConfigurationState;
  checkoutReady: boolean;
  livemode: boolean | null;
}

function secretKeyMode(secretKey: string) {
  if (secretKey.startsWith("sk_test_")) return false;
  if (secretKey.startsWith("sk_live_")) return true;
  return null;
}

export function evaluatePaymentConfiguration(input: PaymentConfigurationInput): PaymentConfiguration {
  if (!input.enabled) return { state: "disabled", checkoutReady: false, livemode: null };
  if (!input.secretKey || !input.webhookSecret?.startsWith("whsec_") || input.expectedLivemode === undefined) {
    return { state: "partial", checkoutReady: false, livemode: null };
  }
  const keyLivemode = secretKeyMode(input.secretKey);
  const expectedLivemode = input.expectedLivemode === "true";
  if (keyLivemode === null || keyLivemode !== expectedLivemode) {
    return { state: "environment-mismatch", checkoutReady: false, livemode: keyLivemode };
  }
  return { state: "ready", checkoutReady: true, livemode: keyLivemode };
}
