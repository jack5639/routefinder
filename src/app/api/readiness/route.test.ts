import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLaunchReadiness } = vi.hoisted(() => ({ getLaunchReadiness: vi.fn() }));
vi.mock("@/lib/launch-readiness-service", () => ({ getLaunchReadiness }));

import { GET } from "./route";

describe("GET /api/readiness", () => {
  beforeEach(() => getLaunchReadiness.mockReset());

  it("fails closed while returning only coarse check states", async () => {
    getLaunchReadiness.mockResolvedValue({
      status: "not-ready",
      checks: { origin: "ready", supabase: "ready", migrations: "not-ready", catalogue: "unavailable", deletionLedger: "unconfigured", payments: "disabled" },
    });
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not-ready",
      checks: { origin: "ready", supabase: "ready", migrations: "not-ready", catalogue: "unavailable", deletionLedger: "unconfigured", payments: "disabled" },
    });
  });

  it("returns ready only when every technical launch check is safe", async () => {
    getLaunchReadiness.mockResolvedValue({
      status: "ready",
      checks: { origin: "ready", supabase: "ready", migrations: "ready", catalogue: "ready", deletionLedger: "ready", payments: "ready" },
    });
    expect((await GET()).status).toBe(200);
  });
});
