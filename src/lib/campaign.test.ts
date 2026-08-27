import { describe, expect, it } from "vitest";

import { normaliseCampaignCode } from "./campaign";

describe("campaign codes", () => {
  it("normalises a bounded attribution code", () => {
    expect(normaliseCampaignCode("  School_Visit-1 ")).toBe("school_visit-1");
  });

  it("rejects free text and query syntax", () => {
    expect(normaliseCampaignCode("school visit" )).toBeUndefined();
    expect(normaliseCampaignCode("source=paid&student=42")).toBeUndefined();
  });
});
