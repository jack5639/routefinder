import { describe, expect, it } from "vitest";

import { parseOpportunitySnapshot, safeOpportunitySnapshot } from "./opportunity-snapshot";

const row = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Software apprentice",
  provider_name: "Example employer",
  kind: "apprenticeship-vacancy",
  sector: "technology",
  location: "Leeds",
  application_url: "https://example.com/apply",
  source_url: "https://example.com/source",
  source_authority: "find-an-apprenticeship-api-v2",
  deadline: null,
  state: "open",
  freshness: "high",
  publication_state: "published",
  verified_at: "2026-08-20T10:00:00.000Z",
};

describe("saved opportunity snapshots", () => {
  it("keeps only the safe display and provenance fields", () => {
    const snapshot = safeOpportunitySnapshot({ ...row, raw_snapshot: { secret: "never copy" } }, "2026-08-21T10:00:00.000Z");

    expect(snapshot.title).toBe("Software apprentice");
    expect(snapshot).not.toHaveProperty("raw_snapshot");
    expect(parseOpportunitySnapshot(snapshot)).toEqual(snapshot);
  });

  it("rejects malformed legacy JSON", () => {
    expect(parseOpportunitySnapshot({ title: "Incomplete" })).toBeNull();
  });
});
