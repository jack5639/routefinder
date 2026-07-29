import { describe, expect, it } from "vitest";
import { clearRoutefinderLocalState } from "@/lib/app-storage";

describe("app storage facade", () => {
  it("can clear the full local demo state without browser storage", () => {
    expect(() => clearRoutefinderLocalState()).not.toThrow();
  });
});
