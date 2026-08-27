import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMutationApiContext, getServerEnv } = vi.hoisted(() => ({
  getMutationApiContext: vi.fn(),
  getServerEnv: vi.fn(),
}));

vi.mock("@/lib/api-context", () => ({
  getMutationApiContext,
  apiError: (message: string, status = 400, code = "invalid") => Response.json({ error: { code, message } }, { status }),
}));
vi.mock("@/lib/env", () => ({ getServerEnv }));

import { POST } from "./route";

describe("checkout payment switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMutationApiContext.mockResolvedValue({
      user: { id: "11111111-1111-4111-8111-111111111111", email: "student@example.test" },
      supabase: { from: vi.fn() },
      admin: { rpc: vi.fn(), from: vi.fn() },
    });
    getServerEnv.mockReturnValue({
      NEXT_PUBLIC_APP_URL: "https://routefinder.example",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      PAYMENTS_ENABLED: false,
      STRIPE_SECRET_KEY: "sk_live_configured_but_disabled",
      STRIPE_WEBHOOK_SECRET: "whsec_configured_but_disabled",
      STRIPE_EXPECTED_LIVEMODE: "true",
    });
  });

  it("fails closed before reading a profile or reserving inventory", async () => {
    const request = new Request("https://routefinder.example/api/checkout", { method: "POST" });
    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "payments-disabled" } });
    const context = await getMutationApiContext.mock.results[0]?.value;
    expect(context.supabase.from).not.toHaveBeenCalled();
    expect(context.admin.rpc).not.toHaveBeenCalled();
  });
});
