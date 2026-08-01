import type { EvidenceCoverage, EvidenceItem, EvidenceRequirementLink, Opportunity, Requirement } from "@/lib/mvp/types";
import type { OpportunityRequirementAssessment, RequirementAction, RequirementAssessmentState } from "@/lib/mvp/requirement-assessment";

export type RequirementGapState = RequirementAssessmentState;

export type GraphAction = RequirementAction;

export interface RequirementGraphLink extends EvidenceRequirementLink {
  evidence: Pick<EvidenceItem, "id" | "evidenceType" | "happened" | "outcome" | "archived">;
}

export interface RequirementGraphNode {
  requirement: Requirement;
  links: RequirementGraphLink[];
  state: RequirementGapState;
  missingDetail: string[];
  action: GraphAction;
}

/** Conservative shared coverage for readiness and weekly-task consumers. */
export function aggregateEvidenceCoverage(
  requirementId: string,
  links: Array<Pick<EvidenceRequirementLink, "requirementId" | "evidenceId" | "coverage" | "confirmedByStudent" | "missingSpecificity">>,
  archivedEvidenceIds: ReadonlySet<string>,
  hardRequirement = false,
): EvidenceCoverage {
  const active = links.filter((link) => link.requirementId === requirementId && !archivedEvidenceIds.has(link.evidenceId));
  if (hardRequirement && active.some((link) => link.coverage === "apparently-unmet")) return "apparently-unmet";
  if (active.some((link) => link.coverage === "needs-confirmation")) return "needs-confirmation";
  if (!active.length) return "missing";
  if (active.some((link) => link.coverage === "weak" || link.missingSpecificity)) return "weak";
  if (active.some((link) => link.coverage === "supported" && link.confirmedByStudent)) return "supported";
  return "needs-confirmation";
}

export function buildRequirementGraph(opportunity: Opportunity, evidenceItems: EvidenceItem[], links: EvidenceRequirementLink[], assessment: OpportunityRequirementAssessment): RequirementGraphNode[] {
  const evidenceById = new Map(evidenceItems.map((item) => [item.id, item]));
  return opportunity.requirements.map((requirement) => {
    const graphLinks = links
      .filter((link) => link.requirementId === requirement.id)
      .flatMap((link) => {
        const evidence = evidenceById.get(link.evidenceId);
        return evidence ? [{ ...link, evidence: { id: evidence.id, evidenceType: evidence.evidenceType, happened: evidence.happened, outcome: evidence.outcome, archived: evidence.archived } }] : [];
      });
    const assessed = assessment.requirements.find((item) => item.requirement.id === requirement.id);
    if (!assessed) throw new Error(`Missing shared assessment for requirement ${requirement.id}.`);
    return { requirement, links: graphLinks, state: assessed.state, missingDetail: assessed.missingDetail, action: assessed.action };
  });
}
