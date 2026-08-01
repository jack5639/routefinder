import { describe, expect, it } from "vitest";

import { assessOpportunityRequirements } from "@/lib/mvp/requirement-assessment";
import { candidatesForOpportunity } from "@/lib/mvp/weekly-candidates";
import type { Opportunity, Qualification } from "@/lib/mvp/types";

const opportunity: Opportunity = {
  id: "opportunity", kind: "university-course", sector: "technology", title: "Computing", providerName: "Provider", location: "Leeds", summary: "", applicationUrl: "https://example.com", sourceUrl: "https://example.com", retrievedAt: "2026-07-01", verifiedAt: "2026-07-02", freshness: "high", state: "open", publicationState: "published",
  requirements: [{ id: "grade", opportunityId: "opportunity", kind: "grade", label: "A level Mathematics grade B", structuredValue: { qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" }, supportingText: "A level Mathematics at B.", sourceUrl: "https://example.com", retrievedAt: "2026-07-01", verifiedAt: "2026-07-02", freshness: "high", conflict: false, publicationState: "published", hardRequirement: true }, { id: "experience", opportunityId: "opportunity", kind: "experience", label: "Relevant experience", supportingText: "Show relevant experience.", sourceUrl: "https://example.com", retrievedAt: "2026-07-01", verifiedAt: "2026-07-02", freshness: "high", conflict: false, publicationState: "published", hardRequirement: false }],
};
const qualification = (overrides: Partial<Qualification> = {}): Qualification => ({ id: "maths", qualificationType: "A level", subject: "Mathematics", grade: "A", status: "achieved", ...overrides });

describe("shared requirement assessment", () => {
  it.each([
    ["predicted", qualification({ status: "predicted" }), "predicted", "Confirm the predicted result"],
    ["unknown grade", qualification({ status: "unknown", grade: undefined }), "unknown-grade", "Confirm the grade"],
    ["unsupported qualification", qualification({ qualificationType: "BTEC", grade: "D*D*D*" }), "unsupported-qualification", "Check accepted qualifications"],
  ] as const)("keeps %s qualification actions separate from evidence", (_case, recorded, state, action) => {
    const result = assessOpportunityRequirements(opportunity, [recorded], true, [{ requirementId: "grade", coverage: "supported", confirmedByStudent: true }]);
    const grade = result.requirements[0];
    expect(grade.state).toBe(state);
    expect(grade.action.title).toContain(action);
    expect(grade.action.title).not.toContain("evidence");
  });

  it("uses a source action before qualifications or evidence, and keeps experience evidence-driven", () => {
    const stale = { ...opportunity, requirements: [{ ...opportunity.requirements[0], conflict: true }, opportunity.requirements[1]] };
    const result = assessOpportunityRequirements(stale, [qualification({ grade: "C" })], true, [{ requirementId: "grade", coverage: "supported", confirmedByStudent: true }]);
    expect(result.requirements[0].state).toBe("needs-checking");
    expect(result.requirements[0].action.title).toContain("Verify");
    expect(result.requirements[1].state).toBe("missing");
    expect(result.requirements[1].action.title).toContain("Add genuine evidence");
  });

  it("supplies the same deterministic action to This Week", () => {
    const result = assessOpportunityRequirements(opportunity, [qualification({ grade: "C" })], true, [{ requirementId: "grade", coverage: "supported", confirmedByStudent: true }]);
    const candidate = candidatesForOpportunity("portfolio", opportunity, result).find((item) => item.requirement?.id === "grade");
    expect(result.eligibility.state).toBe("appears-unmet");
    expect(candidate?.requirementState).toBe("apparently-unmet");
    expect(candidate?.title).toContain("Check the published minimum");
  });
});
