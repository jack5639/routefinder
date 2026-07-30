import { evaluateEligibility } from "@/lib/scoring/decision-views";
import { evaluateEligibilityRule, parseEligibilityRule } from "@/lib/scoring/eligibility-rules";
import type { DecisionExplanation, EligibilityState, EvidenceCoverage, Opportunity, Qualification, Requirement } from "@/lib/mvp/types";

export type RequirementAssessmentState =
  | "supported"
  | "weak"
  | "missing"
  | "needs-confirmation"
  | "apparently-unmet"
  | "predicted"
  | "unknown-grade"
  | "unsupported-qualification"
  | "needs-checking";

export interface RequirementAction {
  title: string;
  whyItMatters: string;
  effortMinutes: number;
  dueDate?: string;
}

export interface AssessmentEvidenceLink {
  requirementId: string;
  evidenceId?: string;
  coverage: EvidenceCoverage;
  confirmedByStudent: boolean;
  missingSpecificity?: string;
  archived?: boolean;
}

export interface RequirementAssessment {
  requirement: Requirement;
  state: RequirementAssessmentState;
  missingDetail: string[];
  action: RequirementAction;
}

export interface OpportunityRequirementAssessment {
  eligibility: DecisionExplanation<EligibilityState>;
  requirements: RequirementAssessment[];
}

function sourceNeedsChecking(requirement: Requirement, opportunity: Opportunity) {
  return opportunity.state === "closed"
    || opportunity.publicationState !== "published"
    || requirement.publicationState !== "published"
    || requirement.conflict
    || requirement.freshness === "needs-checking";
}

function action(requirement: Requirement, opportunity: Opportunity, state: RequirementAssessmentState, missingDetail: string[]): RequirementAction {
  const dueDate = opportunity.deadline;
  if (opportunity.state === "closed") return { title: `Check whether ${opportunity.title} is still open`, whyItMatters: "This opportunity is recorded as closed, so its current requirements and application status need direct confirmation.", effortMinutes: 15, dueDate };
  if (state === "needs-checking") return { title: `Verify ${requirement.label} at the source`, whyItMatters: "This requirement or its source needs direct confirmation before you rely on the current assessment.", effortMinutes: 20, dueDate };
  if (state === "apparently-unmet") return { title: `Check the published minimum for ${requirement.label}`, whyItMatters: "Your recorded qualification is currently below this published minimum. The provider or employer makes the decision, so check accepted alternatives or a suitable backup.", effortMinutes: 20, dueDate };
  if (state === "predicted") return { title: `Confirm the predicted result for ${requirement.label}`, whyItMatters: "This published minimum currently relies on a predicted result, so confirm the prediction and the latest provider conditions.", effortMinutes: 15, dueDate };
  if (state === "unknown-grade") return { title: `Confirm the grade for ${requirement.label}`, whyItMatters: "A relevant grade or result is still unknown, so Routefinder cannot complete this qualification comparison.", effortMinutes: 15, dueDate };
  if (state === "unsupported-qualification") return { title: `Check accepted qualifications for ${requirement.label}`, whyItMatters: "Routefinder cannot compare this qualification or rule safely yet. Check accepted qualifications or equivalencies directly with the provider or employer.", effortMinutes: 20, dueDate };
  if (state === "missing") return { title: `Add genuine evidence for ${requirement.label}`, whyItMatters: "No linked evidence currently explains how your experience relates to this requirement.", effortMinutes: 35, dueDate };
  if (state === "weak") return { title: `Add detail to strengthen ${requirement.label}`, whyItMatters: missingDetail[0] ?? "The linked evidence could be more specific about your contribution, result, or learning.", effortMinutes: 30, dueDate };
  return { title: `Review evidence for ${requirement.label}`, whyItMatters: "This evidence currently supports the requirement; keep it accurate and student-owned.", effortMinutes: 10, dueDate };
}

function evidenceState(requirement: Requirement, links: AssessmentEvidenceLink[]): { state: RequirementAssessmentState; missingDetail: string[] } {
  const active = links.filter((link) => link.requirementId === requirement.id && !link.archived);
  const missingDetail = active.flatMap((link) => link.missingSpecificity ? [link.missingSpecificity] : []);
  if (active.some((link) => link.coverage === "apparently-unmet")) return { state: "apparently-unmet", missingDetail };
  if (active.some((link) => link.coverage === "needs-confirmation")) return { state: "needs-confirmation", missingDetail };
  if (!active.length) return { state: "missing", missingDetail };
  if (active.some((link) => link.coverage === "weak") || missingDetail.length) return { state: "weak", missingDetail };
  if (active.some((link) => link.coverage === "supported" && link.confirmedByStudent)) return { state: "supported", missingDetail };
  return { state: "needs-confirmation", missingDetail };
}

function deterministicState(requirement: Requirement, qualifications: Qualification[], qualificationsComplete: boolean): RequirementAssessmentState {
  if (requirement.kind !== "grade") return "unsupported-qualification";
  const rule = parseEligibilityRule(requirement.structuredValue);
  if (!rule) return "unsupported-qualification";
  const result = evaluateEligibilityRule(rule, qualifications, qualificationsComplete);
  if (result.outcome === "unmet") return "apparently-unmet";
  if (result.outcome === "met-predicted") return "predicted";
  if (result.outcome === "met-achieved") return "supported";
  if (result.outcome === "unknown") return "unknown-grade";
  return "unsupported-qualification";
}

/**
 * The authoritative bridge between deterministic qualification eligibility and
 * evidence coverage. Hard requirements never read student evidence links.
 */
export function assessOpportunityRequirements(
  opportunity: Opportunity,
  qualifications: Qualification[],
  qualificationsComplete: boolean,
  links: AssessmentEvidenceLink[],
): OpportunityRequirementAssessment {
  const eligibility = evaluateEligibility(opportunity, qualifications, qualificationsComplete);
  const requirements = opportunity.requirements.map((requirement) => {
    const evidence = evidenceState(requirement, links);
    const state = sourceNeedsChecking(requirement, opportunity)
      ? "needs-checking"
      : requirement.hardRequirement && requirement.kind === "grade"
        ? deterministicState(requirement, qualifications, qualificationsComplete)
        : evidence.state;
    return { requirement, state, missingDetail: evidence.missingDetail, action: action(requirement, opportunity, state, evidence.missingDetail) };
  });
  return { eligibility, requirements };
}
