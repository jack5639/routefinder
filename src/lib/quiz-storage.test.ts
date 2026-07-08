import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearQuizAnswers,
  loadQuizAnswers,
  loadQuizProgressStep,
  normaliseQuizAnswers,
  QUIZ_ANSWERS_STORAGE_KEY,
  QUIZ_PROGRESS_STEP_STORAGE_KEY,
} from "@/lib/quiz-storage";

function stubWindowStorage(initialValues: Record<string, string>) {
  const store = new Map(Object.entries(initialValues));

  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      removeItem: vi.fn((key: string) => store.delete(key)),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    },
    dispatchEvent: vi.fn(),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normaliseQuizAnswers", () => {
  it("accepts draft quiz answers without changing the data shape", () => {
    expect(
      normaliseQuizAnswers({
        currentStage: "Year 12",
        subjects: [" maths ", "computer science"],
        predictedGrades: "steady",
        interests: ["technology"],
        targetCareer: " software developer ",
        targetCourse: "",
        location: " Manchester ",
        maxTravelMinutes: 47,
        debtPreference: "some-concern",
        earnSoon: 4.4,
        workStyles: ["technical", "practical"],
        constraints: [" debt concern "],
      }),
    ).toEqual({
      currentStage: "Year 12",
      subjects: ["maths", "computer science"],
      predictedGrades: "steady",
      interests: ["technology"],
      targetCareer: "software developer",
      targetCourse: undefined,
      location: "Manchester",
      maxTravelMinutes: 47,
      debtPreference: "some-concern",
      earnSoon: 4,
      workStyles: ["technical", "practical"],
      constraints: ["debt concern"],
    });
  });

  it("rejects invalid answer values", () => {
    expect(normaliseQuizAnswers(null)).toBeNull();
    expect(
      normaliseQuizAnswers({
        currentStage: "Year 12",
        subjects: ["maths"],
        predictedGrades: "steady",
        interests: ["technology"],
        location: "Manchester",
        maxTravelMinutes: 45,
        debtPreference: "some-concern",
        earnSoon: 3,
        workStyles: ["not-a-style"],
        constraints: [],
      }),
    ).toBeNull();
  });

  it("handles missing browser storage safely", () => {
    expect(loadQuizAnswers()).toBeNull();
    expect(loadQuizProgressStep(4)).toBeNull();
    expect(() => clearQuizAnswers()).not.toThrow();
  });

  it("handles invalid stored quiz data safely", () => {
    stubWindowStorage({
      [QUIZ_ANSWERS_STORAGE_KEY]: "{not-json",
      [QUIZ_PROGRESS_STEP_STORAGE_KEY]: "99",
    });

    expect(loadQuizAnswers()).toBeNull();
    expect(loadQuizProgressStep(4)).toBeNull();
    expect(() => clearQuizAnswers()).not.toThrow();
  });
});
