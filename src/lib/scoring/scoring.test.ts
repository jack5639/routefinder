import { describe, expect, it } from "vitest";
import { mockRoutes } from "@/data/routes/mock-routes";
import { testPersonas } from "@/data/test-personas/personas";
import { compareRouteScores, rankRoutes, scoreRoute } from "./scoring";

describe("scoring", () => {
  it("returns ranked routes with explainable scores", () => {
    const ranked = rankRoutes(mockRoutes, testPersonas[0], 5);

    expect(ranked).toHaveLength(5);
    expect(ranked[0].totalScore).toBeGreaterThanOrEqual(ranked[1].totalScore);
    expect(ranked[0].scores.confidence).toBeGreaterThan(0);
    expect(ranked[0].explanation.whyThisRouteFits.length).toBeGreaterThan(0);
    expect(ranked[0].explanation.watchOuts.length).toBeGreaterThan(0);
    expect(ranked[0].explanation.nextSteps.length).toBeGreaterThan(0);
    expect(ranked[0].explanation.backupOptions.length).toBeGreaterThan(0);
  });

  it("keeps scores within 0 to 100", () => {
    for (const persona of testPersonas) {
      for (const route of mockRoutes) {
        const scored = scoreRoute(route, persona);

        expect(scored.totalScore).toBeGreaterThanOrEqual(0);
        expect(scored.totalScore).toBeLessThanOrEqual(100);
        expect(scored.scores.fit).toBeLessThanOrEqual(100);
        expect(scored.scores.feasibility).toBeLessThanOrEqual(100);
        expect(scored.scores.constraint).toBeLessThanOrEqual(100);
        expect(scored.scores.confidence).toBeLessThanOrEqual(100);
      }
    }
  });

  it("responds to what-if changes", () => {
    const baseline = testPersonas[0];
    const changed = {
      ...baseline,
      predictedGrades: "high" as const,
      maxTravelMinutes: 120,
      debtPreference: "open" as const,
      earnSoon: 2,
    };

    const changes = compareRouteScores(mockRoutes, baseline, changed);

    expect(changes.length).toBeGreaterThan(0);
    expect(changes.some((change) => change.label !== "steady")).toBe(true);
  });

  it("includes at least 10 test personas", () => {
    expect(testPersonas.length).toBeGreaterThanOrEqual(10);
  });
});
