import { describe, expect, it } from "vitest";
import { normaliseSavedRoadmap } from "@/lib/saved-roadmap-storage";

describe("normaliseSavedRoadmap", () => {
  it("accepts a saved roadmap with a route id and timestamp", () => {
    expect(
      normaliseSavedRoadmap({
        routeId: " computer-science-degree ",
        savedAt: "2026-07-07T10:00:00.000Z",
      }),
    ).toEqual({
      routeId: "computer-science-degree",
      savedAt: "2026-07-07T10:00:00.000Z",
    });
  });

  it("rejects invalid saved roadmap data", () => {
    expect(normaliseSavedRoadmap(null)).toBeNull();
    expect(normaliseSavedRoadmap({ routeId: "", savedAt: "2026-07-07T10:00:00.000Z" })).toBeNull();
    expect(normaliseSavedRoadmap({ routeId: "route", savedAt: "not-a-date" })).toBeNull();
  });
});
