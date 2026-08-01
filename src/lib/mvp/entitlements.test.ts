import { describe, expect, it } from "vitest";

import { activePlan, canAddActiveOpportunity, canAddEvidence, cycleEndDate } from "@/lib/mvp/entitlements";

describe("entitlements", () => {
  it("enforces free limits", () => {
    expect(canAddActiveOpportunity(null, 4)).toBe(true);
    expect(canAddActiveOpportunity(null, 5)).toBe(false);
    expect(canAddEvidence(null, 10)).toBe(false);
  });

  it("allows unlimited Cycle saves while application tracking keeps its own limit", () => {
    const entitlement = { plan: "cycle" as const, status: "active" as const, endsAt: "2027-09-30T23:59:59.999Z" };
    expect(canAddActiveOpportunity(entitlement, 15)).toBe(true);
    expect(canAddActiveOpportunity(entitlement, 100)).toBe(true);
    expect(canAddEvidence(entitlement, 100)).toBe(true);
  });

  it("falls back to free after expiry or refund", () => {
    expect(activePlan({ plan: "cycle", status: "refunded" })).toBe("free");
    expect(activePlan({ plan: "cycle", status: "active", endsAt: "2025-01-01T00:00:00.000Z" })).toBe("free");
  });

  it("ends access on 30 September following the entry year", () => {
    expect(cycleEndDate(2027).toISOString()).toBe("2027-09-30T23:59:59.999Z");
  });
});
