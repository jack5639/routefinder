import type { Opportunity } from "@/lib/mvp/types";
import type { OpportunityRequirementAssessment } from "@/lib/mvp/requirement-assessment";
import type { TaskCandidate } from "@/lib/mvp/tasks";

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
      title: item.action.title,
      whyItMatters: item.action.whyItMatters,
      effortMinutes: item.action.effortMinutes,
      dueDate: application?.deadline ?? opportunity.deadline,
      requirement: item.requirement,
      requirementState: item.state,
      applicationStageBlocked: application?.stage === "preparing" && !application.nextAction,
      sharedOpportunityCount: 1,
    }));
}
