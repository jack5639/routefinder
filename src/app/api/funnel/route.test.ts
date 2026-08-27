import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, rpc, insert } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

import { POST } from "./route";

describe("POST /api/funnel", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: true, error: null });
    insert.mockResolvedValue({ error: null });
    createAdminClient.mockReturnValue({ rpc, from: vi.fn(() => ({ insert })) });
  });

  it("records only a small validated public event", async () => {
    const response = await POST(new Request("https://routefinder.example/api/funnel", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://routefinder.example" },
      body: JSON.stringify({ eventName: "starting_path_selected", properties: { path: "focused", campaign: "school-1" } }),
    }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith({ user_id: null, event_name: "starting_path_selected", properties: { path: "focused", campaign: "school-1" } });
  });

  it("rejects arbitrary properties", async () => {
    const response = await POST(new Request("https://routefinder.example/api/funnel", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://routefinder.example" },
      body: JSON.stringify({ eventName: "first_useful_result_viewed", properties: { path: "unsure", studentName: "A Student" } }),
    }));

    expect(response.status).toBe(400);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("accepts the actual local development origin when the canonical URL differs", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const response = await POST(new Request("http://127.0.0.1:3000/api/funnel", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://127.0.0.1:3000" },
      body: JSON.stringify({ eventName: "paywall_viewed", properties: {} }),
    }));

    expect(response.status).toBe(201);
  });

  it("uses only the configured canonical origin in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://routefinder.example");
    const response = await POST(new Request("https://internal-host.example/api/funnel", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://internal-host.example" },
      body: JSON.stringify({ eventName: "paywall_viewed", properties: {} }),
    }));

    expect(response.status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
