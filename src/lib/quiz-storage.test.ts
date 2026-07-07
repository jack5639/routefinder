import { describe, expect, it } from "vitest";
import { normaliseQuizAnswers } from "@/lib/quiz-storage";

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
});
