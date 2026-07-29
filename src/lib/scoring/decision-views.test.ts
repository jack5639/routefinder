import { describe, expect, it } from "vitest";

import type { Opportunity, Qualification, StudentProfile } from "@/lib/mvp/types";
import {
  assessOpportunity,
  evaluateEligibility,
  evaluateInformationConfidence,
  evaluateReadiness,
} from "@/lib/scoring/decision-views";

const profile: StudentProfile = {
  id: "user-1",
  currentStage: "Year 13",
  applicationCycle: 2027,
  homeRegion: "Manchester",
  maxTravelMinutes: 60,
  relocationPreference: "stay-local",
  routeIntent: "combined",
  sectors: ["technology"],
  workStyles: ["technical"],
  financialPreference: "cost-aware",
  constraints: [],
};

const qualifications: Qualification[] = [
  {
    id: "qualification-1",
    subject: "Mathematics",
    qualificationType: "A level",
    grade: "A",
    status: "predicted",
  },
];

const opportunity: Opportunity = {
  id: "opportunity-1",
  kind: "university-course",
  sector: "technology",
  title: "Computing course",
  providerName: "Reviewed provider",
  location: "Manchester",
  summary: "A reviewed test opportunity.",
  applicationUrl: "https://example.com/apply",
  sourceUrl: "https://example.com/course",
  retrievedAt: "2026-07-20T00:00:00.000Z",
  verifiedAt: "2026-07-21T00:00:00.000Z",
  freshness: "high",
  state: "open",
  publicationState: "published",
  requirements: [
    {
      id: "requirement-1",
      opportunityId: "opportunity-1",
      kind: "grade",
      label: "A level Mathematics grade B",
      structuredValue: { qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" },
      supportingText: "A level Mathematics at grade B.",
      sourceUrl: "https://example.com/course",
      retrievedAt: "2026-07-20T00:00:00.000Z",
      verifiedAt: "2026-07-21T00:00:00.000Z",
      freshness: "high",
      conflict: false,
      publicationState: "published",
      hardRequirement: true,
    },
  ],
};

describe("commercial decision views", () => {
  it("keeps predicted matches separate from achieved eligibility", () => {
    expect(evaluateEligibility(opportunity, qualifications).state).toBe("may-be-met");
    expect(
      evaluateEligibility(opportunity, [{ ...qualifications[0], status: "achieved" }]).state,
    ).toBe("appears-met");
  });

  it("marks a known below-minimum grade as apparently unmet", () => {
    expect(evaluateEligibility(opportunity, [{ ...qualifications[0], grade: "C" }]).state).toBe("appears-unmet");
  });

  it("keeps unknown grades and conflicting facts visible", () => {
    expect(evaluateEligibility(opportunity, [{ ...qualifications[0], grade: undefined, status: "unknown" }]).state).toBe(
      "needs-checking",
    );
    const conflicting = {
      ...opportunity,
      requirements: [{ ...opportunity.requirements[0], conflict: true }],
    };
    expect(evaluateEligibility(conflicting, qualifications).state).toBe("needs-checking");
  });

  it("does not assess readiness without reviewed requirements", () => {
    expect(evaluateReadiness([], []).state).toBe("unknown");
  });

  it("changes readiness when confirmed evidence covers the requirement", () => {
    expect(
      evaluateReadiness(opportunity.requirements, [
        { requirementId: "requirement-1", coverage: "supported", confirmedByStudent: true },
      ]).state,
    ).toBe("well-supported");
  });

  it("reduces confidence for external or unreviewed records", () => {
    expect(
      evaluateInformationConfidence({ ...opportunity, kind: "external", publicationState: "draft" }).state,
    ).toBe("needs-checking");
  });

  it("returns all five independent views without a total score", () => {
    const assessment = assessOpportunity({
      profile,
      qualifications,
      opportunity,
      evidenceLinks: [],
      portfolioSize: 3,
    });

    expect(Object.keys(assessment)).toEqual([
      "eligibility",
      "fit",
      "readiness",
      "informationConfidence",
      "portfolioRole",
    ]);
    expect(assessment).not.toHaveProperty("totalScore");
  });
});
