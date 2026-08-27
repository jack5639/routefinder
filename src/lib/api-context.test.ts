import { afterEach, describe, expect, it, vi } from "vitest";

import { isSameOriginRequest } from "./same-origin";

afterEach(() => vi.unstubAllEnvs());

describe("same-origin mutation boundary", () => {
  it("accepts the configured application origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");

    expect(isSameOriginRequest(new Request("https://app.example.test/api/profile", {
      method: "PUT",
      headers: { origin: "https://app.example.test" },
    }))).toBe(true);
  });

  it("rejects a foreign Origin and modern cross-site fetch", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");

    expect(isSameOriginRequest(new Request("https://app.example.test/api/profile", {
      method: "PUT",
      headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request("https://app.example.test/api/profile", {
      method: "PUT",
      headers: { "sec-fetch-site": "cross-site" },
    }))).toBe(false);
  });

  it("keeps origin-less server and route-test requests compatible", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.test");

    expect(isSameOriginRequest(new Request("https://app.example.test/api/profile", { method: "PUT" }))).toBe(true);
  });
});
