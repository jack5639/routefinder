import { describe, expect, it } from "vitest";
import { mockRoutes } from "@/data/routes/mock-routes";
import { testPersonas } from "@/data/test-personas/personas";
import { buildDecisionBoard, buildSimulatorComparison, compareRouteScores, rankRoutes, scoreRoute } from "./scoring";

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

  it("changes route ranking when answers change", () => {
    const technicalRoutes = rankRoutes(mockRoutes, testPersonas[0], 5);
    const healthRoutes = rankRoutes(mockRoutes, testPersonas[1], 5);

    expect(technicalRoutes[0].id).not.toBe(healthRoutes[0].id);
    expect(technicalRoutes[0].id).toBe("software-degree-apprenticeship");
    expect(healthRoutes[0].id).toBe("healthcare-college-route");
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

  it("labels simulator appearances and disappearances from the visible top routes", () => {
    const visibleLimit = 3;
    const baselineTopIds = new Set(rankRoutes(mockRoutes, testPersonas[0], visibleLimit).map((route) => route.id));
    const changedTopIds = new Set(rankRoutes(mockRoutes, testPersonas[1], visibleLimit).map((route) => route.id));
    const changesById = new Map(
      compareRouteScores(mockRoutes, testPersonas[0], testPersonas[1], visibleLimit).map((change) => [change.routeId, change]),
    );

    expect(Array.from(changedTopIds).some((routeId) => !baselineTopIds.has(routeId))).toBe(true);
    expect(Array.from(baselineTopIds).some((routeId) => !changedTopIds.has(routeId))).toBe(true);

    for (const routeId of changedTopIds) {
      if (!baselineTopIds.has(routeId)) {
        expect(changesById.get(routeId)?.label).toBe("appeared");
      }
    }

    for (const routeId of baselineTopIds) {
      if (!changedTopIds.has(routeId)) {
        expect(changesById.get(routeId)?.label).toBe("disappeared");
      }
    }
  });

  it("builds simulator comparisons with ranked routes and explanations", () => {
    const comparison = buildSimulatorComparison(mockRoutes, testPersonas[0], {
      ...testPersonas[0],
      predictedGrades: "high",
      maxTravelMinutes: 120,
      debtPreference: "open",
      targetCourse: "data science",
      earnSoon: 2,
    });

    expect(comparison.baselineRoutes).toHaveLength(5);
    expect(comparison.changedRoutes).toHaveLength(5);
    expect(comparison.changes.length).toBeGreaterThan(0);
    expect(comparison.changes[0].explanations.length).toBeGreaterThan(0);
    expect(comparison.changes[0].baselineScore).not.toBeNull();
    expect(comparison.changes[0].changedScore).not.toBeNull();
  });

  it("groups scored routes into a decision board without dropping routes", () => {
    const board = buildDecisionBoard(mockRoutes, testPersonas[0]);
    const groupedRoutes = board.flatMap((group) => group.routes);
    const groupedIds = new Set(groupedRoutes.map((route) => route.id));

    expect(board.map((group) => group.title)).toEqual([
      "Strong fit",
      "Realistic",
      "Stretch",
      "Safer backup",
      "Worth exploring",
    ]);
    expect(groupedRoutes).toHaveLength(mockRoutes.length);
    expect(groupedIds.size).toBe(mockRoutes.length);
    expect(board.find((group) => group.id === "strong-fit")?.routes[0]?.id).toBe("software-degree-apprenticeship");
  });

  it("includes at least 10 test personas", () => {
    expect(testPersonas.length).toBeGreaterThanOrEqual(10);
  });
});
