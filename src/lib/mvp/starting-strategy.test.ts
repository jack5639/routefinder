import { describe, expect, it } from "vitest";
import { buildStartingStrategy } from "@/lib/mvp/starting-strategy";

describe("starting strategy", () => {
  it("keeps unknown qualifications visible without ranking routes", () => {
    const strategy = buildStartingStrategy(
      {
        id: "student",
        currentStage: "Year 12",
        applicationCycle: 2027,
        homeRegion: "West Midlands",
        maxTravelMinutes: 60,
        relocationPreference: "unsure",
        routeIntent: "combined",
        sectors: ["technology", "engineering"],
        workStyles: ["practical"],
        financialPreference: "cost-aware",
        constraints: ["Need to confirm travel"],
      },
      [{ id: "q1", qualificationType: "A level", subject: "Maths", status: "unknown" }],
    );
    expect(strategy.observations.join(" ")).toContain("qualification detail");
    expect(strategy.firstActions.join(" ")).toContain("Maths");
    expect(JSON.stringify(strategy)).not.toMatch(/score|best route|acceptance probability/i);
  });
});
