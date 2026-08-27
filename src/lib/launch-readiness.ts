import type { PaymentConfigurationState } from "@/lib/payment-configuration";

export type ReadinessCheckState = "ready" | "not-ready" | "unavailable" | "unconfigured";

export interface LaunchReadinessChecks {
  origin: ReadinessCheckState;
  supabase: ReadinessCheckState;
  migrations: ReadinessCheckState;
  catalogue: ReadinessCheckState;
  deletionLedger: ReadinessCheckState;
  payments: PaymentConfigurationState;
}

export function launchReadinessStatus(checks: LaunchReadinessChecks) {
  const paymentsSafe = checks.payments === "disabled" || checks.payments === "ready";
  return checks.origin === "ready"
    && checks.supabase === "ready"
    && checks.migrations === "ready"
    && checks.catalogue === "ready"
    && checks.deletionLedger === "ready"
    && paymentsSafe
    ? "ready" as const
    : "not-ready" as const;
}
