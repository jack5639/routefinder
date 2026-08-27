import { describe, expect, it } from "vitest";

import type { Opportunity, Qualification, Requirement, StudentProfile } from "@/lib/mvp/types";
import {
  assessOpportunity,
  evaluateEligibility,
  evaluateFit,
  evaluateInformationConfidence,
  evaluatePortfolioRole,
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
  qualificationsComplete: true,
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

function withRequirements(requirements: Requirement[]): Opportunity {
  return { ...opportunity, requirements };
}

function requirement(structuredValue: Record<string, unknown>, overrides: Partial<Requirement> = {}): Requirement {
  return { ...opportunity.requirements[0], structuredValue, ...overrides };
}

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

  it("keeps absent qualifications uncertain while the record is incomplete", () => {
    expect(evaluateEligibility(opportunity, [], false).state).toBe("needs-checking");
    expect(evaluateEligibility(opportunity, [], true).state).toBe("appears-unmet");
  });

  it.each([
    ["an unrecognised recorded grade", { ...qualifications[0], grade: "Pass" }],
    ["a missing recorded grade", { ...qualifications[0], grade: undefined }],
    ["an unsupported qualification type", { ...qualifications[0], qualificationType: "BTEC", grade: "D*D*D*" }],
  ])("fails closed for %s", (_case, qualification) => {
    expect(evaluateEligibility(opportunity, [qualification]).state).toBe("needs-checking");
  });

  it.each([
    ["an unrecognised minimum", { qualificationType: "A level", subject: "Mathematics", minimumGrade: "Pass" }],
    ["an empty structured value", {}],
    ["a missing qualification type", { subject: "Mathematics", minimumGrade: "B" }],
  ])("fails closed for %s", (_case, structuredValue) => {
    expect(evaluateEligibility(withRequirements([requirement(structuredValue)]), qualifications).state).toBe("needs-checking");
  });

  it("does not let unsupported hard-requirement kinds or substring matches pass", () => {
    expect(evaluateEligibility(withRequirements([requirement({ qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" }, { kind: "skill" })]), qualifications).state).toBe("needs-checking");
    expect(evaluateEligibility(opportunity, [{ ...qualifications[0], qualificationType: "A level equivalent" }]).state).toBe("needs-checking");
    expect(evaluateEligibility(opportunity, [{ ...qualifications[0], subject: "Further Mathematics" }]).state).toBe("appears-unmet");
  });

  it("uses every mandatory requirement and preserves a known unmet result", () => {
    const physics = requirement({ qualificationType: "A level", subject: "Physics", minimumGrade: "B" }, { id: "requirement-2", label: "A level Physics grade B" });
    expect(evaluateEligibility(withRequirements([opportunity.requirements[0], physics]), [
      { ...qualifications[0], status: "achieved" },
      { id: "qualification-2", qualificationType: "A level", subject: "Physics", grade: "C", status: "achieved" },
    ]).state).toBe("appears-unmet");
  });

  it("requires checking when a mandatory requirement is unsupported even if another is unmet", () => {
    const unsupported = requirement(
      { qualificationType: "A level", subject: "Physics", minimumGrade: "Pass" },
      { id: "requirement-2", label: "Unsupported Physics requirement" },
    );
    expect(evaluateEligibility(withRequirements([opportunity.requirements[0], unsupported]), [
      { ...qualifications[0], grade: "C", status: "achieved" },
    ]).state).toBe("needs-checking");
  });

  it("keeps a missing matching qualification with unsupported alternatives as needs-checking", () => {
    expect(evaluateEligibility(opportunity, [{ ...qualifications[0], qualificationType: "BTEC", subject: "Computing", grade: "D*D*D*" }]).state).toBe("needs-checking");
  });

  it("does not classify unpublished hard requirements as eligible", () => {
    expect(evaluateEligibility(withRequirements([requirement({ qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" }, { publicationState: "draft" })]), qualifications).state).toBe("needs-checking");
  });

  it("keeps closed, stale, and missing opportunity facts visible", () => {
    expect(evaluateEligibility({ ...opportunity, state: "closed" }, qualifications).state).toBe("needs-checking");
    expect(evaluateEligibility(withRequirements([requirement({ qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" }, { freshness: "needs-checking" })]), qualifications).state).toBe("needs-checking");
    expect(evaluateEligibility({ ...opportunity, requirements: [] }, qualifications).state).toBe("unknown");
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

  it("does not count archived evidence and keeps unconfirmed evidence visible", () => {
    expect(evaluateReadiness(opportunity.requirements, [
      { requirementId: "requirement-1", coverage: "supported", confirmedByStudent: true, archived: true },
    ]).state).toBe("early-stage");
    expect(evaluateReadiness(opportunity.requirements, [
      { requirementId: "requirement-1", coverage: "supported", confirmedByStudent: false },
    ]).state).toBe("early-stage");
  });

  it("reduces confidence for external or unreviewed records", () => {
    expect(
      evaluateInformationConfidence({ ...opportunity, kind: "external", publicationState: "draft" }).state,
    ).toBe("needs-checking");
  });

  it("does not infer a regional location match or alter fit from travel preferences", () => {
    const westMidlandsProfile: StudentProfile = {
      ...profile,
      homeRegion: "West Midlands",
      maxTravelMinutes: 30,
      relocationPreference: "stay-local",
      workStyles: ["practical"],
      financialPreference: "prefer-lower-debt",
      constraints: ["I need to stay close to caring responsibilities"],
    };
    const birminghamOpportunity = { ...opportunity, location: "Birmingham" };
    const assessment = evaluateFit(westMidlandsProfile, birminghamOpportunity);

    expect(assessment.state).toBe("currently-strong");
    expect(assessment.evaluatedPreferences).toEqual(expect.arrayContaining([
      expect.stringContaining("Sector:"),
      expect.stringContaining("Route intention:"),
    ]));
    expect(assessment.unassessedPreferences).toEqual(expect.arrayContaining([
      expect.stringContaining("Location and travel"),
      expect.stringContaining("Relocation"),
      expect.stringContaining("Work styles"),
      expect.stringContaining("Financial preference"),
      expect.stringContaining("Recorded constraints"),
    ]));
    expect(assessment.unassessedPreferences.join(" ")).not.toContain("Birmingham");
    expect(assessment.risks.join(" ")).toContain("sector and route intention only");
  });

  it("never uses a substring location comparison", () => {
    const profileWithSubstringHomeArea = { ...profile, homeRegion: "Man" };
    const assessment = evaluateFit(profileWithSubstringHomeArea, opportunity);

    expect(assessment.state).toBe("currently-strong");
    expect(assessment.evaluatedPreferences).toHaveLength(2);
    expect(assessment.unassessedPreferences[0]).toContain("Location and travel");
  });

  const portfolioRolePersonas = [
    {
      name: "published minimum currently unmet",
      eligibility: "appears-unmet" as const,
      fit: "currently-weaker" as const,
      confidence: "high" as const,
      portfolioSize: 3,
      expected: "ambitious",
    },
    {
      name: "aligned qualifications and assessed preferences",
      eligibility: "appears-met" as const,
      fit: "currently-strong" as const,
      confidence: "high" as const,
      portfolioSize: 3,
      expected: "currently-plausible",
    },
    {
      name: "aligned qualifications with mixed assessed preferences",
      eligibility: "appears-met" as const,
      fit: "mixed" as const,
      confidence: "high" as const,
      portfolioSize: 3,
      expected: "qualification-aligned-alternative",
    },
    {
      name: "predicted qualifications with mixed assessed preferences",
      eligibility: "may-be-met" as const,
      fit: "mixed" as const,
      confidence: "high" as const,
      portfolioSize: 3,
      expected: "exploratory",
    },
    {
      name: "incomplete material information",
      eligibility: "needs-checking" as const,
      fit: "currently-strong" as const,
      confidence: "needs-checking" as const,
      portfolioSize: 3,
      expected: "needs-checking",
    },
  ] as const;

  it.each(portfolioRolePersonas)("assigns the fixed portfolio-role persona: $name", (persona) => {
    const assessment = evaluatePortfolioRole(
      persona.eligibility,
      persona.fit,
      persona.confidence,
      persona.portfolioSize,
    );

    expect(assessment.state).toBe(persona.expected);
    expect(`${assessment.reasons.join(" ")} ${assessment.risks.join(" ")}`).not.toMatch(/lower risk|safe/i);
    if (persona.expected === "qualification-aligned-alternative") {
      expect(assessment.risks.join(" ")).toContain("does not indicate likelihood, competitiveness, or risk");
    }
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

  it("does not let confirmed evidence override a below-minimum hard grade", () => {
    const assessment = assessOpportunity({
      profile,
      qualifications: [{ ...qualifications[0], grade: "C", status: "achieved" }],
      opportunity,
      evidenceLinks: [{ requirementId: "requirement-1", coverage: "supported", confirmedByStudent: true }],
      portfolioSize: 1,
    });

    expect(assessment.eligibility.state).toBe("appears-unmet");
    expect(assessment.readiness.state).toBe("urgent-gaps");
    expect(assessment.readiness.state).not.toBe("well-supported");
  });
});
