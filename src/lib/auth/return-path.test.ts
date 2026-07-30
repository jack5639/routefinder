import { describe, expect, it } from "vitest";

import { normalisePostLoginPath } from "@/lib/auth/return-path";

describe("normalisePostLoginPath", () => {
  it.each([
    "/app",
    "/readiness",
    "/opportunities",
    "/portfolio",
    "/evidence",
    "/tracker",
    "/account",
    "/strategy",
    "/admin/catalogue",
  ])("preserves an allowlisted internal path: %s", (path) => {
    expect(normalisePostLoginPath(path)).toBe(path);
  });

  it.each([
    undefined,
    "",
    "https://attacker.example",
    "//attacker.example",
    "/\\attacker.example",
    "\\\\attacker.example",
    "/%2fattacker.example",
    "/%252fattacker.example",
    "/%5cattacker.example",
    "/%255cattacker.example",
    "/%0aattacker.example",
    "/app%0d%0aLocation:%20https://attacker.example",
    "/app\u0000",
    "/app\n",
    "/ app",
    "/%68ttps%3A%2F%2Fattacker.example",
    "/%",
    "/not-allowlisted",
    "/app?next=//attacker.example",
    42,
  ])("falls back for an unsafe or unallowlisted value: %j", (value) => {
    expect(normalisePostLoginPath(value)).toBe("/app");
  });
});
