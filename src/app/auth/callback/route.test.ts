import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAdminClient, createClient, insert } = vi.hoisted(() => ({ createAdminClient: vi.fn(), createClient: vi.fn(), insert: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  const exchangeCodeForSession = vi.fn();
  const verifyOtp = vi.fn();
  const getUser = vi.fn();

  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    verifyOtp.mockReset();
    verifyOtp.mockResolvedValue({ error: null });
    getUser.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: "11111111-1111-4111-8111-111111111111" } } });
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
    createAdminClient.mockReturnValue({ from: vi.fn(() => ({ insert })) });
    createClient.mockResolvedValue({ auth: { exchangeCodeForSession, verifyOtp, getUser } });
  });

  it("redirects to an allowlisted path on the application origin", async () => {
    const response = await GET(new Request("https://routefinder.test/auth/callback?code=valid&next=%2Fportfolio"));

    expect(response.headers.get("location")).toBe("https://routefinder.test/portfolio");
  });

  it.each([
    "//attacker.example",
    "/%2fattacker.example",
    "/%252fattacker.example",
    "/%5cattacker.example",
    "/%0aattacker.example",
    "https://attacker.example",
  ])("falls back to /app for malicious next value %s", async (next) => {
    const response = await GET(new Request(`https://routefinder.test/auth/callback?code=valid&next=${encodeURIComponent(next)}`));

    expect(response.headers.get("location")).toBe("https://routefinder.test/app");
  });

  it("verifies token-hash email links for server-side auth callbacks", async () => {
    const response = await GET(new Request("https://routefinder.test/auth/callback?token_hash=hash&type=magiclink&next=%2Fadmin%2Fcatalogue"));

    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "magiclink" });
    expect(response.headers.get("location")).toBe("https://routefinder.test/admin/catalogue");
  });

  it("records a validated campaign after authentication without changing the destination", async () => {
    const response = await GET(new Request("https://routefinder.test/auth/callback?code=valid&next=%2Freadiness&campaign=school-visit"));

    expect(response.headers.get("location")).toBe("https://routefinder.test/readiness");
    expect(insert).toHaveBeenCalledWith({
      user_id: "11111111-1111-4111-8111-111111111111",
      event_name: "campaign_attributed",
      properties: { campaign: "school-visit" },
    });
  });
});
