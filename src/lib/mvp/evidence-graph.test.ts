import { describe, expect, it } from "vitest";

import { buildRequirementGraph } from "@/lib/mvp/evidence-graph";
import { assessOpportunityRequirements } from "@/lib/mvp/requirement-assessment";
import type { EvidenceItem, EvidenceRequirementLink, Opportunity } from "@/lib/mvp/types";

const opportunity: Opportunity = {
  id: "opportunity", kind: "university-course", sector: "technology", title: "Reviewed computing course", providerName: "Provider", location: "Leeds", summary: "", applicationUrl: "https://example.com", sourceUrl: "https://example.com", retrievedAt: "2026-07-01", verifiedAt: "2026-07-02", freshness: "high", state: "open", publicationState: "published",
  requirements: [{ id: "hard", opportunityId: "opportunity", kind: "skill", label: "Problem solving", supportingText: "Show problem solving.", sourceUrl: "https://example.com", retrievedAt: "2026-07-01", verifiedAt: "2026-07-02", freshness: "high", conflict: false, publicationState: "published", hardRequirement: true }, { id: "other", opportunityId: "opportunity", kind: "skill", label: "Teamwork", supportingText: "Show teamwork.", sourceUrl: "https://example.com", retrievedAt: "2026-07-01", verifiedAt: "2026-07-02", freshness: "high", conflict: false, publicationState: "published", hardRequirement: false }],
};
const evidence: EvidenceItem[] = [{ id: "one", evidenceType: "Project", happened: "Built a game", contribution: "Coded", outcome: "Finished", learned: "Testing", archived: false }, { id: "two", evidenceType: "Volunteering", happened: "Supported a club", contribution: "Organised", outcome: "Ran", learned: "Communication", archived: false }];
function link(overrides: Partial<EvidenceRequirementLink> = {}): EvidenceRequirementLink { return { id: "link", evidenceId: "one", requirementId: "hard", relevance: "Shows debugging", coverage: "supported", confirmedByStudent: true, assessmentVersion: 1, ...overrides }; }
function assessment(current = opportunity, links: EvidenceRequirementLink[] = []) {
  return assessOpportunityRequirements(current, [], true, links);
}

describe("requirements-to-evidence graph", () => {
  it("keeps a deterministic grade result ahead of a student-created evidence link", () => {
    const gradeOpportunity = { ...opportunity, requirements: [{ ...opportunity.requirements[0], id: "grade", kind: "grade" as const, label: "A level Mathematics grade B", structuredValue: { qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" } }] };
    const gradeLink = link({ requirementId: "grade", coverage: "supported" });
    const result = assessOpportunityRequirements(gradeOpportunity, [{ id: "maths", qualificationType: "A level", subject: "Mathematics", grade: "C", status: "achieved" }], true, [{ ...gradeLink, archived: false }]);
    const graph = buildRequirementGraph(gradeOpportunity, evidence, [gradeLink], result);
    expect(result.eligibility.state).toBe("appears-unmet");
    expect(graph[0].state).toBe("apparently-unmet");
    expect(graph[0].action.title).toContain("Check the published minimum");
    expect(graph[0].action.title).not.toContain("evidence");
  });

  it("shows an explicit gap when no evidence is linked", () => {
    const node = buildRequirementGraph(opportunity, evidence, [], assessment()).find((item) => item.requirement.id === "hard");
    expect(node?.state).toBe("missing");
    expect(node?.action.title).toContain("Add genuine evidence");
  });

  it("keeps every mapping and makes a hard unmet link urgent even beside support", () => {
    const links = [link(), link({ id: "link-two", evidenceId: "two", coverage: "apparently-unmet" })];
    const graph = buildRequirementGraph(opportunity, evidence, links, assessment(opportunity, links));
    expect(graph[0].links).toHaveLength(2);
    expect(graph[0].state).toBe("apparently-unmet");
  });

  it("does not count archived or unconfirmed evidence as confirmed support", () => {
    expect(buildRequirementGraph(opportunity, [{ ...evidence[0], archived: true }], [link()], assessment(opportunity, [{ ...link(), archived: true }]))[0].state).toBe("missing");
    const unconfirmed = link({ confirmedByStudent: false });
    expect(buildRequirementGraph(opportunity, evidence, [unconfirmed], assessment(opportunity, [unconfirmed]))[0].state).toBe("needs-confirmation");
  });

  it("makes missing specificity visible and supports one item mapping to several requirements", () => {
    const links = [link({ missingSpecificity: "Explain your individual contribution" }), link({ id: "second", requirementId: "other", missingSpecificity: "Add the result" })];
    const graph = buildRequirementGraph(opportunity, evidence, links, assessment(opportunity, links));
    expect(graph[0].state).toBe("weak");
    expect(graph[1].links[0].evidence.id).toBe("one");
  });

  it("fails visibly for source conflicts and is deterministic", () => {
    const conflicted = { ...opportunity, requirements: [{ ...opportunity.requirements[0], conflict: true }, opportunity.requirements[1]] };
    expect(buildRequirementGraph(conflicted, evidence, [link()], assessment(conflicted, [link()]))[0].state).toBe("needs-checking");
    expect(buildRequirementGraph(opportunity, evidence, [link()], assessment(opportunity, [link()]))).toEqual(buildRequirementGraph(opportunity, evidence, [link()], assessment(opportunity, [link()])));
  });
});
