export type PlanCode = "free" | "cycle";

export interface Entitlement {
  plan: PlanCode;
  status: "active" | "refunded" | "disputed" | "payment_review" | "expired";
  endsAt?: string;
}

export const planLimits = {
  free: {
    activeOpportunities: 5,
    evidenceItems: 10,
    weeklyRefreshesPerMonth: 1,
  },
  cycle: {
    activeOpportunities: Number.POSITIVE_INFINITY,
    evidenceItems: Number.POSITIVE_INFINITY,
    weeklyRefreshesPerMonth: Number.POSITIVE_INFINITY,
  },
} as const;

export function activePlan(entitlement: Entitlement | null | undefined, now = new Date()): PlanCode {
  if (!entitlement || entitlement.status !== "active") {
    return "free";
  }

  if (entitlement.endsAt && new Date(entitlement.endsAt) <= now) {
    return "free";
  }

  return entitlement.plan;
}

export function canAddActiveOpportunity(entitlement: Entitlement | null | undefined, currentCount: number) {
  return currentCount < planLimits[activePlan(entitlement)].activeOpportunities;
}

export function canAddEvidence(entitlement: Entitlement | null | undefined, currentCount: number) {
  return currentCount < planLimits[activePlan(entitlement)].evidenceItems;
}

export function cycleEndDate(applicationCycle: number) {
  return new Date(Date.UTC(applicationCycle, 8, 30, 23, 59, 59, 999));
}
