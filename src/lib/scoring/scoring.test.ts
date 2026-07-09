import { describe, expect, it } from "vitest";
import { mockRoutes } from "@/data/routes/mock-routes";
<<<<<<< HEAD
import { testPersonaProfiles, testPersonas } from "@/data/test-personas/personas";
import type { QuizAnswers } from "@/types";
import {
  applySingleSimulatorChange,
  buildDecisionBoardWithFeedback,
=======
import { testPersonas } from "@/data/test-personas/personas";
import type { QuizAnswers } from "@/types";
import {
  applySingleSimulatorChange,
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
  buildDecisionBoard,
  buildSimulatorComparison,
  compareRouteScores,
  countSimulatorChangedFactors,
<<<<<<< HEAD
  createEmptyRouteFeedbackState,
  rankRoutes,
  rankRoutesWithFeedback,
  scoreRoute,
  toggleRouteFeedbackAction,
} from ".";

const personaById = new Map(testPersonaProfiles.map((profile) => [profile.id, profile]));
const requestedPersonaScenarios = [
  "Completely unsure, high grades, open to university",
  "Completely unsure, lower grades, wants to earn soon",
  "Target career: software developer, debt-averse",
  "Target career: solicitor, high grades",
  "Target course: psychology, medium grades",
  "Healthcare interest, location-constrained",
  "Creative/media interest, portfolio-oriented",
  "Engineering interest, practical learner",
  "Business/finance interest, wants high earnings",
  "Low grades, does not want debt, wants local options",
];

function personaAnswers(id: string) {
  const profile = personaById.get(id);

  if (!profile) {
    throw new Error(`Missing test persona: ${id}`);
  }

  return profile.answers;
}

function hasOverlap<T>(left: Iterable<T>, right: Iterable<T>) {
  const rightSet = new Set(right);
  return Array.from(left).some((item) => rightSet.has(item));
}
=======
  rankRoutes,
  scoreRoute,
} from "./scoring";
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42

describe("scoring", () => {
  it("returns ranked routes with explainable scores", () => {
    const ranked = rankRoutes(mockRoutes, personaAnswers("software-developer-debt-averse"), 5);

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
    const technicalRoutes = rankRoutes(mockRoutes, personaAnswers("software-developer-debt-averse"), 5);
    const healthRoutes = rankRoutes(mockRoutes, personaAnswers("healthcare-location-constrained"), 5);

    expect(technicalRoutes[0].id).not.toBe(healthRoutes[0].id);
    expect(technicalRoutes[0].id).toBe("software-degree-apprenticeship");
    expect(healthRoutes[0].id).toBe("healthcare-college-route");
  });

  it("responds to what-if changes", () => {
    const baseline = personaAnswers("software-developer-debt-averse");
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

  it("builds one-change-at-a-time simulator scenarios", () => {
<<<<<<< HEAD
    const baseline = personaAnswers("software-developer-debt-averse");
=======
    const baseline = testPersonas[0];
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
    const changed = applySingleSimulatorChange(baseline, "travel", {
      maxTravelMinutes: 120,
      predictedGrades: "high",
      debtPreference: "open",
    });

    expect(changed.maxTravelMinutes).toBe(120);
    expect(changed.predictedGrades).toBe(baseline.predictedGrades);
    expect(changed.debtPreference).toBe(baseline.debtPreference);
    expect(countSimulatorChangedFactors(baseline, changed)).toBe(1);

    const comparison = buildSimulatorComparison(mockRoutes, baseline, changed);

    expect(comparison.baselineRoutes).toHaveLength(5);
    expect(comparison.changedRoutes).toHaveLength(5);
    expect(comparison.changes.length).toBeGreaterThan(0);
  });

  it("labels simulator appearances and disappearances from the visible top routes", () => {
    const visibleLimit = 3;
    const baselineAnswers = personaAnswers("software-developer-debt-averse");
    const changedAnswers = personaAnswers("healthcare-location-constrained");
    const baselineTopIds = new Set(rankRoutes(mockRoutes, baselineAnswers, visibleLimit).map((route) => route.id));
    const changedTopIds = new Set(rankRoutes(mockRoutes, changedAnswers, visibleLimit).map((route) => route.id));
    const changesById = new Map(
      compareRouteScores(mockRoutes, baselineAnswers, changedAnswers, visibleLimit).map((change) => [change.routeId, change]),
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
    const baseline = personaAnswers("software-developer-debt-averse");
    const comparison = buildSimulatorComparison(mockRoutes, baseline, {
      ...baseline,
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
    const board = buildDecisionBoard(mockRoutes, personaAnswers("software-developer-debt-averse"));
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

  it("always places at least one route in Strong fit for a completed quiz profile", () => {
    const cautiousProfile: QuizAnswers = {
      currentStage: "Year 12",
      subjects: ["english"],
      predictedGrades: "needs-building",
      interests: ["outdoors"],
      location: "Local area",
      maxTravelMinutes: 10,
      debtPreference: "avoid",
      earnSoon: 1,
      workStyles: ["academic"],
      constraints: ["location limit"],
    };
    const board = buildDecisionBoard(mockRoutes, cautiousProfile);
    const strongFitRoutes = board.find((group) => group.id === "strong-fit")?.routes ?? [];
    const groupedRouteIds = board.flatMap((group) => group.routes.map((route) => route.id));

    expect(strongFitRoutes.length).toBeGreaterThanOrEqual(1);
    expect(new Set(groupedRouteIds).size).toBe(groupedRouteIds.length);
  });

  it("keeps decision board routes unique across categories", () => {
<<<<<<< HEAD
    const board = buildDecisionBoard(mockRoutes, personaAnswers("creative-media-portfolio"));
=======
    const board = buildDecisionBoard(mockRoutes, testPersonas[2]);
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
    const routeIds = board.flatMap((group) => group.routes.map((route) => route.id));

    expect(new Set(routeIds).size).toBe(routeIds.length);
    expect(routeIds.sort()).toEqual(mockRoutes.map((route) => route.id).sort());
  });

  it("keeps demo route data ready for future source-backed records", () => {
    for (const route of mockRoutes) {
      expect(route.evidenceLevel).toBe("demo");
      expect(route.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(route.costOrPaySummary).toBeTruthy();
      expect(route.bursaryOrSupportSummary).toBeTruthy();
    }
  });

  it("includes at least 10 test personas", () => {
    expect(testPersonas).toHaveLength(10);
    expect(testPersonaProfiles.map((profile) => profile.scenario)).toEqual(requestedPersonaScenarios);
  });

  it("checks broad expected route behavior for each requested persona", () => {
    for (const profile of testPersonaProfiles) {
      const ranked = rankRoutes(mockRoutes, profile.answers, mockRoutes.length);
      const topRouteTypes = new Set(ranked.slice(0, 5).map((route) => route.type));
      const availableRouteTypes = new Set(ranked.map((route) => route.type));
      const viableBackupTypes = new Set(ranked.slice(0, 6).map((route) => route.type));
      const availableStretchRoutes = ranked.filter((route) => profile.expectedRanking.stretchRouteTypes.includes(route.type));

      expect(hasOverlap(topRouteTypes, profile.expectedRanking.likelyStrongRouteTypes), profile.scenario).toBe(true);
      expect(hasOverlap(viableBackupTypes, profile.expectedRanking.viableBackupRouteTypes), profile.scenario).toBe(true);
      expect(hasOverlap(availableRouteTypes, profile.expectedRanking.stretchRouteTypes), profile.scenario).toBe(true);
      expect(availableStretchRoutes.some((route) => route.explanation.watchOuts.length > 0), profile.scenario).toBe(true);
      expect(profile.expectedRanking.constraintsThatShouldMatterMost.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses local route feedback to demote a route marked not for me", () => {
    const answers = personaAnswers("software-developer-debt-averse");
    const baseline = rankRoutes(mockRoutes, answers, 5);
    const feedbackState = toggleRouteFeedbackAction(
      createEmptyRouteFeedbackState(),
      baseline[0].id,
      "not-for-me",
      "2026-07-09T10:00:00.000Z",
    );
    const reranked = rankRoutesWithFeedback(mockRoutes, answers, feedbackState, mockRoutes.length);
    const demotedRoute = reranked.find((route) => route.id === baseline[0].id);

    expect(baseline[0].id).toBe("software-degree-apprenticeship");
    expect(reranked[0].id).not.toBe(baseline[0].id);
    expect(demotedRoute?.feedbackAdjustment?.delta).toBeLessThan(0);
  });

  it("uses preference feedback to lift lower-debt routes over higher-debt routes", () => {
    const answers = personaAnswers("unsure-high-grades-open-university");
    const baseline = rankRoutes(mockRoutes, answers, mockRoutes.length);
    const baselineLowDebt = baseline.find((route) => route.id === "software-degree-apprenticeship");
    const baselineHighDebt = baseline.find((route) => route.id === "computer-science-degree");
    const feedbackState = toggleRouteFeedbackAction(
      createEmptyRouteFeedbackState(),
      "computer-science-degree",
      "lower-debt-routes",
      "2026-07-09T10:00:00.000Z",
    );
    const reranked = rankRoutesWithFeedback(mockRoutes, answers, feedbackState, mockRoutes.length);
    const rerankedLowDebt = reranked.find((route) => route.id === "software-degree-apprenticeship");
    const rerankedHighDebt = reranked.find((route) => route.id === "computer-science-degree");

    expect(baselineLowDebt).toBeDefined();
    expect(baselineHighDebt).toBeDefined();
    expect(rerankedLowDebt).toBeDefined();
    expect(rerankedHighDebt).toBeDefined();
    expect((rerankedLowDebt?.totalScore ?? 0) - (rerankedHighDebt?.totalScore ?? 0)).toBeGreaterThan(
      (baselineLowDebt?.totalScore ?? 0) - (baselineHighDebt?.totalScore ?? 0),
    );
    expect(rerankedHighDebt?.feedbackAdjustment?.activeActionLabels).toContain("Lower-debt routes");
  });

  it("builds a feedback-adjusted decision board without dropping routes", () => {
    const answers = personaAnswers("business-finance-high-earnings");
    const feedbackState = toggleRouteFeedbackAction(
      createEmptyRouteFeedbackState(),
      "business-higher-apprenticeship",
      "higher-earning-routes",
      "2026-07-09T10:00:00.000Z",
    );
    const board = buildDecisionBoardWithFeedback(mockRoutes, answers, feedbackState);
    const routeIds = board.flatMap((group) => group.routes.map((route) => route.id));

    expect(new Set(routeIds).size).toBe(mockRoutes.length);
    expect(routeIds).toContain("business-higher-apprenticeship");
    expect(
      board
        .flatMap((group) => group.routes)
        .some((route) => route.id === "business-higher-apprenticeship" && route.feedbackAdjustment),
    ).toBe(true);
  });
});
