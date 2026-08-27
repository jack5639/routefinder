import { afterEach, describe, expect, it, vi } from "vitest";

import { canonicalOriginIsValid, getServerEnv } from "./env";

const required = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://staging-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

afterEach(() => vi.unstubAllEnvs());

describe("server environment validation", () => {
  it("treats blank optional variables as absent", () => {
    for (const [name, value] of Object.entries(required)) vi.stubEnv(name, value);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "  ");
    vi.stubEnv("STRIPE_EXPECTED_LIVEMODE", "");

    expect(getServerEnv()).toMatchObject({ ...required, PAYMENTS_ENABLED: false });
  });

  it("defaults payments off and validates the switch strictly", () => {
    for (const [name, value] of Object.entries(required)) vi.stubEnv(name, value);
    expect(getServerEnv().PAYMENTS_ENABLED).toBe(false);
    vi.stubEnv("PAYMENTS_ENABLED", "yes");
    expect(() => getServerEnv()).toThrow();
  });

  it("still rejects malformed non-empty optional variables", () => {
    for (const [name, value] of Object.entries(required)) vi.stubEnv(name, value);
    vi.stubEnv("STRIPE_EXPECTED_LIVEMODE", "production");

    expect(() => getServerEnv()).toThrow();
  });

  it("rejects non-HTTPS and localhost canonical origins in production", () => {
    expect(canonicalOriginIsValid(undefined, true)).toBe(false);
    expect(canonicalOriginIsValid("http://myroutefinder.co.uk", true)).toBe(false);
    expect(canonicalOriginIsValid("https://localhost", true)).toBe(false);
    expect(canonicalOriginIsValid("https://myroutefinder.co.uk", true)).toBe(true);
  });

  it("normalises a valid canonical origin before URL composition", () => {
    for (const [name, value] of Object.entries(required)) vi.stubEnv(name, value);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000/");
    expect(getServerEnv().NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
});
