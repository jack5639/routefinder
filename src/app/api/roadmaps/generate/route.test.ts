import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultQuizAnswers } from "@/data/default-answers";
import { mockRoutes } from "@/data/routes/mock-routes";
import type { GeneratedRoadmap, RoadmapTask } from "@/types";
import { generatedRoadmapSectionDefinitions } from "@/lib/roadmaps/generated-roadmap";

const openAiMock = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: openAiMock.create,
    };
  },
}));

const { POST } = await import("./route");

const route = mockRoutes[0];
const originalApiKey = process.env.OPENAI_API_KEY;

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/roadmaps/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function makeTask(overrides: Partial<RoadmapTask> = {}): RoadmapTask {
  return {
    title: "Compare one real version",
    detail: "Write down one reachable provider or employer option, then note the entry checks and one question.",
    timeframe: "This week",
    whyItMatters: "It turns the route into a concrete comparison without relying on demo data as final.",
    evidenceToGather: "Provider notes, entry requirements, and one question to check.",
    checks: [
      {
        label: "Check source",
        detail: "Confirm details directly with the provider or employer.",
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
    profileSummary: "The saved quiz points to technical interests, practical work, and earning sooner.",
    confidenceNote: "This is a planning aid from saved answers and demo route data, not a promise about outcomes.",
    sections: generatedRoadmapSectionDefinitions.map((section) => ({
      id: section.id,
      title: section.title,
      summary: `${section.title} focuses on one practical next move.`,
      tasks: [makeTask(), makeTask({ title: "Add one evidence note" })],
    })),
    watchOuts: ["Entry checks and local availability need checking directly."],
    backupOptions: [...route.backupOptions],
    sourceWarnings: [
      {
        label: "Demo data",
        detail: "The route catalogue is demo-level and needs direct checking.",
        trustLabel: "Based on demo route data",
      },
    ],
    followUpPrompts: [],
    ...overrides,
  };
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-api-key";
  openAiMock.create.mockReset();
});

afterEach(() => {
  process.env.OPENAI_API_KEY = originalApiKey;
});

describe("POST /api/roadmaps/generate", () => {
  it("returns a validated roadmap from the Responses API", async () => {
    openAiMock.create.mockResolvedValue({
      output_text: JSON.stringify(makeRoadmap()),
    });

    const response = await POST(
      makeRequest({
        routeId: route.id,
        answers: defaultQuizAnswers,
        followUps: {
          weeklyTime: "2 hours",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.roadmap.routeId).toBe(route.id);
    expect(payload.roadmap.backupOptions).toEqual(route.backupOptions);
    expect(openAiMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.5",
        store: false,
        reasoning: {
          effort: "medium",
        },
        text: expect.objectContaining({
          verbosity: "low",
          format: expect.objectContaining({
            type: "json_schema",
            strict: true,
          }),
        }),
      }),
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("uses fallback response when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(
      makeRequest({
        routeId: route.id,
        answers: defaultQuizAnswers,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.reason).toBe("missing-api-key");
    expect(openAiMock.create).not.toHaveBeenCalled();
  });

  it("rejects malformed model output", async () => {
    openAiMock.create.mockResolvedValue({
      output_text: "{not-json",
    });

    const response = await POST(
      makeRequest({
        routeId: route.id,
        answers: defaultQuizAnswers,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.reason).toBe("malformed-output");
  });

  it("rejects generated output that fails local validation", async () => {
    openAiMock.create.mockResolvedValue({
      output_text: JSON.stringify(
        makeRoadmap({
          headline: "This is the best route for you",
        }),
      ),
    });

    const response = await POST(
      makeRequest({
        routeId: route.id,
        answers: defaultQuizAnswers,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.reason).toBe("validation-failed");
    expect(payload.errors.length).toBeGreaterThan(0);
  });

  it("returns fallback response when OpenAI generation fails", async () => {
    openAiMock.create.mockRejectedValue(new Error("network failed"));

    const response = await POST(
      makeRequest({
        routeId: route.id,
        answers: defaultQuizAnswers,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.reason).toBe("generation-failed");
  });
});
