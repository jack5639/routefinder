import { describe, expect, it } from "vitest";
import { defaultQuizAnswers } from "@/data/default-answers";
import { mockRoutes } from "@/data/routes/mock-routes";
import { scoreRoute } from "@/lib/scoring";
import type { GeneratedRoadmap, RoadmapTask } from "@/types";
import {
  generatedRoadmapSectionDefinitions,
  normaliseGeneratedRoadmap,
  validateGeneratedRoadmap,
} from "./generated-roadmap";
import { buildRoadmapGenerationInput, normaliseRoadmapFollowUpAnswers } from "./roadmap-generation-input";

const route = mockRoutes[0];

function makeTask(overrides: Partial<RoadmapTask> = {}): RoadmapTask {
  return {
    title: "Compare one real version",
    detail: "Write down one provider or employer option, the entry checks, travel pattern, and one question to ask.",
    timeframe: "This week",
    whyItMatters: "A concrete comparison keeps this route practical without treating the demo data as final.",
    evidenceToGather: "Provider notes, application requirements, and one question for a tutor or adviser.",
    checks: [
      {
        label: "Source check",
        detail: "Check requirements directly with the provider or employer before acting.",
        trustLabel: "Needs checking",
      },
    ],
    trustLabels: ["Based on your quiz", "Suggested next action"],
    ...overrides,
  };
}

function makeRoadmap(overrides: Partial<GeneratedRoadmap> = {}): GeneratedRoadmap {
  return {
    routeId: route.id,
    generatedAt: "2026-07-09T10:00:00.000Z",
    headline: "Custom plan for a software degree apprenticeship",
    profileSummary: "The saved quiz points to technology, practical work, and earning sooner as useful planning signals.",
    confidenceNote: "This is a planning aid from demo route data and saved answers, not a promise about outcomes.",
    sections: generatedRoadmapSectionDefinitions.map((section) => ({
      id: section.id,
      title: section.title,
      summary: `${section.title} focuses on one practical comparison step.`,
      tasks: [makeTask(), makeTask({ title: "Add one evidence note" })],
    })),
    watchOuts: ["Application stages and local availability need checking directly."],
    backupOptions: [...route.backupOptions],
    sourceWarnings: [
      {
        label: "Demo data",
        detail: "Route data is demo-level and needs checking against official provider or employer sources.",
        trustLabel: "Based on demo route data",
      },
    ],
    followUpPrompts: [
      {
        id: "weeklyTime",
        label: "Weekly time",
        question: "How much time can go into applications or evidence each week?",
        whyItHelps: "This changes whether the roadmap should start with small actions or a bigger project.",
      },
    ],
    ...overrides,
  };
}

describe("generated roadmap validation", () => {
  it("accepts schema-valid roadmap data and aligns backup options to route data", () => {
    const result = validateGeneratedRoadmap(
      makeRoadmap({
        backupOptions: ["Model tried to change this"],
      }),
      {
        routeId: route.id,
        backupOptions: route.backupOptions,
      },
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.roadmap.sections).toHaveLength(5);
      expect(result.roadmap.sections[0].tasks).toHaveLength(2);
      expect(result.roadmap.backupOptions).toEqual(route.backupOptions);
    }
  });

  it("rejects missing required fields", () => {
    const roadmap = makeRoadmap() as Record<string, unknown>;
    delete roadmap.sections;

    expect(normaliseGeneratedRoadmap(roadmap, { routeId: route.id })).toBeNull();
  });

  it("rejects overlong task lists", () => {
    const roadmap = makeRoadmap({
      sections: generatedRoadmapSectionDefinitions.map((section) => ({
        id: section.id,
        title: section.title,
        summary: `${section.title} summary.`,
        tasks: [makeTask(), makeTask(), makeTask(), makeTask(), makeTask()],
      })),
    });

    expect(normaliseGeneratedRoadmap(roadmap, { routeId: route.id })).toBeNull();
  });

  it("rejects banned advice language", () => {
    const roadmap = makeRoadmap({
      headline: "This is the best route for you",
    });

    expect(normaliseGeneratedRoadmap(roadmap, { routeId: route.id })).toBeNull();
  });

  it("rejects unsupported source claims", () => {
    const roadmap = makeRoadmap({
      sections: generatedRoadmapSectionDefinitions.map((section, index) => ({
        id: section.id,
        title: section.title,
        summary: `${section.title} summary.`,
        tasks: [
          makeTask({
            detail:
              index === 0
                ? "Apply through https://example.com because this vacancy is open."
                : "Compare the route using provider information and saved quiz constraints.",
          }),
          makeTask({ title: "Add one evidence note" }),
        ],
      })),
    });

    expect(normaliseGeneratedRoadmap(roadmap, { routeId: route.id })).toBeNull();
  });
});

describe("roadmap generation input", () => {
  it("builds model input from route facts, quiz answers, scores, and follow-ups", () => {
    const scored = scoreRoute(route, defaultQuizAnswers);
    const input = buildRoadmapGenerationInput({
      route,
      scored,
      answers: defaultQuizAnswers,
      followUps: {
        weeklyTime: " 2 hours after college ",
        existingEvidence: "Small app project",
      },
      generatedAt: "2026-07-09T10:00:00.000Z",
    });

    expect(input.generatedAt).toBe("2026-07-09T10:00:00.000Z");
    expect(input.route.id).toBe(route.id);
    expect(input.quizProfile.targetCareer).toBe(defaultQuizAnswers.targetCareer);
    expect(input.scoring.watchOuts.length).toBeGreaterThan(0);
    expect(input.followUps.weeklyTime).toBe("2 hours after college");
    expect(input.followUps.existingEvidence).toBe("Small app project");
  });

  it("normalises only supported optional follow-up fields", () => {
    expect(
      normaliseRoadmapFollowUpAnswers({
        weeklyTime: " weekends ",
        other: "ignored",
        supportNeeds: "",
      }),
    ).toEqual({
      weeklyTime: "weekends",
    });
  });
});
