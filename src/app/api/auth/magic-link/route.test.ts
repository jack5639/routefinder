import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, createClient } = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { POST } from "@/app/api/auth/magic-link/route";

describe("POST /api/auth/magic-link", () => {
  const signInWithOtp = vi.fn();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://routefinder.test";
    createAdminClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) });
    signInWithOtp.mockReset();
    signInWithOtp.mockResolvedValue({ error: null });
    createClient.mockResolvedValue({ auth: { signInWithOtp } });
  });

  it.each([
    ["an allowlisted destination", "/portfolio", "/portfolio"],
    ["a scheme-relative URL", "//attacker.example", "/app"],
    ["a double-encoded scheme-relative URL", "/%252fattacker.example", "/app"],
    ["a backslash URL", "/%5cattacker.example", "/app"],
  ])("uses only the normalised path for %s", async (_case, nextPath, expectedPath) => {
    const response = await POST(new Request("https://routefinder.test/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@example.com", nextPath }),
    }));

    expect(response.status).toBe(200);
    expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: `https://routefinder.test/auth/callback?next=${encodeURIComponent(expectedPath)}`,
      }),
    }));
  });

  it("carries only a validated campaign code into the callback", async () => {
    const response = await POST(new Request("https://routefinder.test/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://routefinder.test" },
      body: JSON.stringify({ email: "student@example.com", nextPath: "/readiness", campaign: "school-visit" }),
    }));

    expect(response.status).toBe(200);
    expect(signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: "https://routefinder.test/auth/callback?next=%2Freadiness&campaign=school-visit",
      }),
    }));
  });
});
