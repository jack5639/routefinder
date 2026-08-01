import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  const exchangeCodeForSession = vi.fn();

  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    createClient.mockResolvedValue({ auth: { exchangeCodeForSession } });
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
});
