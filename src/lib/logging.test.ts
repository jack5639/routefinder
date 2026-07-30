import { afterEach, describe, expect, it, vi } from "vitest";
import { logServerEvent } from "@/lib/logging";

describe("structured logging", () => {
  afterEach(() => vi.restoreAllMocks());
  it("redacts personal and secret fields", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logServerEvent("info", "test", { userEmail: "student@example.com", nested: { accessToken: "secret" }, count: 2 });
    expect(info).toHaveBeenCalledOnce();
    const record = JSON.parse(String(info.mock.calls[0][0]));
    expect(record.userEmail).toBe("[redacted]");
    expect(record.nested.accessToken).toBe("[redacted]");
    expect(record.count).toBe(2);
  });
});
