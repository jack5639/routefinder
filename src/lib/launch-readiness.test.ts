import { describe, expect, it } from "vitest";

import { launchReadinessStatus } from "./launch-readiness";

const ready = { origin: "ready", supabase: "ready", migrations: "ready", catalogue: "ready", deletionLedger: "ready", payments: "disabled" } as const;

describe("launch readiness policy", () => {
  it("permits a truthful payments-disabled beta when every other technical gate passes", () => {
    expect(launchReadinessStatus(ready)).toBe("ready");
  });

  it("fails closed for each unavailable required boundary", () => {
    expect(launchReadinessStatus({ ...ready, catalogue: "not-ready" })).toBe("not-ready");
    expect(launchReadinessStatus({ ...ready, payments: "partial" })).toBe("not-ready");
  });
});
