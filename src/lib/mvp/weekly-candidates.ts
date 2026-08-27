import type { Opportunity } from "@/lib/mvp/types";
import type { OpportunityRequirementAssessment } from "@/lib/mvp/requirement-assessment";
import type { TaskCandidate } from "@/lib/mvp/tasks";

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableValue(entry)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

function sharedGapKey(requirement: Opportunity["requirements"][number]) {
  const label = requirement.label.trim().toLowerCase().replace(/\s+/g, " ");
  return requirement.hardRequirement
    ? `hard:${requirement.kind}:${stableValue(requirement.structuredValue ?? null)}:${label}`
    : `evidence:${requirement.kind}:${label}`;
}

export function candidatesForOpportunity(
  portfolioItemId: string,
  opportunity: Opportunity,
  assessment: OpportunityRequirementAssessment,
  application?: { stage?: string; deadline?: string; nextAction?: string | null },
): TaskCandidate[] {
  return assessment.requirements
    .filter((item) => item.state !== "supported")
    .map((item) => ({
      id: `${portfolioItemId}:${item.requirement.id}`,
      portfolioItemId,
      opportunityTitle: opportunity.title,
      providerName: opportunity.providerName,
      sharedGapKey: sharedGapKey(item.requirement),
      title: item.action.title,
      whyItMatters: item.action.whyItMatters,
      effortMinutes: item.action.effortMinutes,
      dueDate: application?.deadline ?? opportunity.deadline,
      requirement: item.requirement,
      requirementState: item.state,
      applicationStageBlocked: application?.stage === "preparing" && !application.nextAction,
    }));
}
