import type {
  DecisionExplanation,
  EvidenceCoverage,
  FactConfidence,
  FitState,
  Opportunity,
  OpportunityAssessment,
  PortfolioRole,
  Qualification,
  ReadinessState,
  Requirement,
  StudentProfile,
  EligibilityState,
} from "@/lib/mvp/types";
import { evaluateEligibilityRule, parseEligibilityRule, type RuleEvaluation } from "@/lib/scoring/eligibility-rules";
import { assessOpportunityRequirements, type OpportunityRequirementAssessment } from "@/lib/mvp/requirement-assessment";

export interface EvidenceLinkSummary {
  id?: string;
  evidenceId?: string;
  requirementId: string;
  coverage: EvidenceCoverage;
  confirmedByStudent: boolean;
  missingSpecificity?: string;
  assessmentVersion?: number;
  archived?: boolean;
}

export interface AssessmentInput {
  profile: StudentProfile;
  qualifications: Qualification[];
  opportunity: Opportunity;
  evidenceLinks: EvidenceLinkSummary[];
  portfolioSize: number;
  requirementAssessment?: OpportunityRequirementAssessment;
}

function baseExplanation<TState extends string>(state: TState): DecisionExplanation<TState> {
  return {
    state,
    reasons: [],
    risks: [],
    missingInformation: [],
    evaluatedPreferences: [],
    unassessedPreferences: [],
    sourceFacts: [],
    directCheckAction: "Check the latest requirement directly with the provider or employer.",
  };
}

function requirementSourceFacts(requirements: Requirement[]) {
  return requirements.map((requirement) => ({
    label: requirement.label,
    sourceUrl: requirement.sourceUrl,
    verifiedAt: requirement.verifiedAt,
  }));
}

export function evaluateEligibility(
  opportunity: Opportunity,
  qualifications: Qualification[],
  qualificationsComplete = true,
): DecisionExplanation<EligibilityState> {
  const published = opportunity.requirements.filter((requirement) => requirement.publicationState === "published");
  const explanation = baseExplanation<EligibilityState>("unknown");
  explanation.sourceFacts = requirementSourceFacts(published);

  if (opportunity.state === "closed") {
    explanation.state = "needs-checking";
    explanation.risks.push("This opportunity is recorded as closed.");
    explanation.directCheckAction = "Check the official listing before doing any application work.";
    return explanation;
  }

  if (opportunity.publicationState !== "published" || opportunity.kind === "external") {
    explanation.state = "needs-checking";
    explanation.missingInformation.push("This opportunity has not completed Routefinder publication review.");
    return explanation;
  }

  if (opportunity.requirements.some((requirement) => requirement.hardRequirement && requirement.publicationState !== "published")) {
    explanation.state = "needs-checking";
    explanation.missingInformation.push("A hard requirement is not yet reviewed and published.");
    return explanation;
  }

  if (!published.length) {
    explanation.missingInformation.push("No reviewed entry requirements are available yet.");
    return explanation;
  }

  if (published.some((requirement) => requirement.conflict || requirement.freshness === "needs-checking")) {
    explanation.state = "needs-checking";
    explanation.risks.push("One or more published requirements are conflicting or need reverification.");
    return explanation;
  }

  const hardRequirements = published.filter((requirement) => requirement.hardRequirement);

  if (!hardRequirements.length) {
    explanation.state = "needs-checking";
    explanation.missingInformation.push("The reviewed record does not identify a deterministic minimum requirement.");
    return explanation;
  }

  const evaluations = hardRequirements.map((requirement): RuleEvaluation => {
    if (requirement.kind !== "grade") {
      return {
        outcome: "unsupported-or-invalid",
        messages: [`${requirement.label} is a hard requirement that Routefinder cannot compare deterministically yet.`],
      };
    }
    const rule = parseEligibilityRule(requirement.structuredValue);
    if (!rule) {
      return {
        outcome: "unsupported-or-invalid",
        messages: [`${requirement.label} does not contain a supported, complete qualification rule.`],
      };
    }
    return evaluateEligibilityRule(rule, qualifications, qualificationsComplete);
  });

  for (const evaluation of evaluations) {
    if (evaluation.outcome === "unmet") explanation.risks.push(...evaluation.messages);
    else if (evaluation.outcome === "unknown" || evaluation.outcome === "unsupported-or-invalid") explanation.missingInformation.push(...evaluation.messages);
    else explanation.reasons.push(...evaluation.messages);
  }

  if (evaluations.some((evaluation) => evaluation.outcome === "unknown" || evaluation.outcome === "unsupported-or-invalid")) {
    explanation.state = "needs-checking";
  } else if (evaluations.some((evaluation) => evaluation.outcome === "unmet")) {
    explanation.state = "appears-unmet";
  } else if (evaluations.some((evaluation) => evaluation.outcome === "met-predicted")) {
    explanation.state = "may-be-met";
  } else {
    explanation.state = "appears-met";
  }

  explanation.risks.push("Contextual, equivalent, or unrecorded requirements may still apply.");
  return explanation;
}

export function evaluateFit(profile: StudentProfile, opportunity: Opportunity): DecisionExplanation<FitState> {
  const explanation = baseExplanation<FitState>("mixed");
  let signals = 0;

  if (opportunity.sector !== "unclassified" && profile.sectors.includes(opportunity.sector)) {
    signals += 2;
    const message = `Sector: the opportunity is in your selected ${opportunity.sector} sector.`;
    explanation.reasons.push(message);
    explanation.evaluatedPreferences.push(message);
  } else {
    const message = "Sector: this sector is not currently selected in your readiness profile.";
    explanation.risks.push(message);
    explanation.evaluatedPreferences.push(message);
  }

  const routeMatches =
    profile.routeIntent === "combined" ||
    (profile.routeIntent === "university" && opportunity.kind === "university-course") ||
    (profile.routeIntent === "apprenticeship" && opportunity.kind === "apprenticeship-vacancy");

  if (routeMatches) {
    signals += 1;
    const message = "Route intention: the opportunity matches your current route intention.";
    explanation.reasons.push(message);
    explanation.evaluatedPreferences.push(message);
  } else {
    const message = "Route intention: the route type differs from your current intention, so it may be exploratory.";
    explanation.risks.push(message);
    explanation.evaluatedPreferences.push(message);
  }

  explanation.unassessedPreferences.push(
    "Location and travel: this opportunity has no normalised area, distance, or travel-time information to compare with your broad home area and travel limit.",
    "Relocation: this opportunity has no structured location or relocation information to compare with your preference.",
    "Work styles: this opportunity has no structured work-pattern information to compare with your preferences.",
    "Financial preference: this opportunity has no structured cost, pay, or debt information to compare with your preference.",
    "Recorded constraints: free-text constraints cannot be matched safely without structured, source-backed opportunity facts.",
  );
  explanation.risks.push("This fit view currently assesses sector and route intention only; check the official listing for location, travel, work pattern, costs or pay, and constraint implications.");

  explanation.state = signals >= 3 ? "currently-strong" : signals <= 0 ? "currently-weaker" : "mixed";
  return explanation;
}

export function evaluateReadiness(
  requirements: Requirement[],
  evidenceLinks: EvidenceLinkSummary[],
): DecisionExplanation<ReadinessState> {
  const explanation = baseExplanation<ReadinessState>("unknown");
  const published = requirements.filter((requirement) => requirement.publicationState === "published");

  if (!published.length) {
    explanation.missingInformation.push("Reviewed requirements are needed before evidence coverage can be assessed.");
    return explanation;
  }

  const coverageFor = (requirementId: string) => evidenceLinks.filter((link) => link.requirementId === requirementId && !link.archived);
  const hardMissing = published.some((requirement) => requirement.hardRequirement && coverageFor(requirement.id).some((link) => link.coverage === "apparently-unmet"));
  const supported = published.filter((requirement) => coverageFor(requirement.id).some((link) => link.coverage === "supported" && link.confirmedByStudent)).length;
  const weak = published.filter((requirement) => coverageFor(requirement.id).some((link) => link.coverage === "weak" || Boolean(link.missingSpecificity))).length;
  const missing = published.filter((requirement) => {
    const links = coverageFor(requirement.id);
    return !links.length || links.some((link) => link.coverage === "needs-confirmation") || !links.some((link) => link.coverage === "supported" && link.confirmedByStudent);
  }).length;

  if (hardMissing) {
    explanation.state = "urgent-gaps";
    explanation.risks.push("A hard requirement is currently marked as apparently unmet.");
  } else if (supported === published.length) {
    explanation.state = "well-supported";
    explanation.reasons.push("Every reviewed requirement has a student-confirmed evidence link.");
  } else if (supported > 0 || weak > 0) {
    explanation.state = "partly-supported";
    explanation.reasons.push(`${supported} requirement${supported === 1 ? "" : "s"} currently have confirmed evidence coverage.`);
    if (missing) {
      explanation.missingInformation.push(`${missing} requirement${missing === 1 ? "" : "s"} still need evidence or confirmation.`);
    }
  } else {
    explanation.state = "early-stage";
    explanation.missingInformation.push("No reviewed requirement has confirmed evidence coverage yet.");
  }

  return explanation;
}

/**
 * Builds the readiness view from the shared authoritative requirement
 * assessment. Deterministic hard requirements have already been evaluated
 * from qualifications here, so an evidence link cannot overwrite them.
 */
export function evaluateReadinessAssessment(
  assessment: OpportunityRequirementAssessment,
): DecisionExplanation<ReadinessState> {
  const explanation = baseExplanation<ReadinessState>("unknown");
  const requirements = assessment.requirements;
  if (!requirements.length) {
    explanation.missingInformation.push("Reviewed requirements are needed before preparation can be assessed.");
    return explanation;
  }

  const stateCount = (state: (typeof requirements)[number]["state"]) => requirements.filter((item) => item.state === state).length;
  const supported = stateCount("supported");
  const predicted = stateCount("predicted");
  const incomplete = requirements.length - supported;

  if (stateCount("apparently-unmet") > 0) {
    explanation.state = "urgent-gaps";
    explanation.risks.push("A deterministic hard requirement currently appears unmet from the recorded qualifications.");
  } else if (supported === requirements.length) {
    explanation.state = "well-supported";
    explanation.reasons.push("Every reviewed requirement is currently supported by the appropriate qualification or student-confirmed evidence.");
  } else if (supported > 0 || predicted > 0 || stateCount("weak") > 0) {
    explanation.state = "partly-supported";
    if (supported) explanation.reasons.push(`${supported} requirement${supported === 1 ? " is" : "s are"} currently supported.`);
    if (predicted) explanation.missingInformation.push(`${predicted} hard requirement${predicted === 1 ? " relies" : "s rely"} on a predicted result and still needs confirmation.`);
    if (incomplete - predicted > 0) explanation.missingInformation.push(`${incomplete - predicted} requirement${incomplete - predicted === 1 ? " needs" : "s need"} more evidence or checking.`);
  } else {
    explanation.state = "early-stage";
    explanation.missingInformation.push("The reviewed requirements still need evidence, qualification details, or direct confirmation.");
  }
  return explanation;
}

export function evaluateInformationConfidence(opportunity: Opportunity): DecisionExplanation<FactConfidence> {
  const explanation = baseExplanation<FactConfidence>(opportunity.freshness);
  const published = opportunity.requirements.filter((requirement) => requirement.publicationState === "published");

  if (opportunity.publicationState !== "published" || opportunity.kind === "external") {
    explanation.state = "needs-checking";
    explanation.risks.push("This record has not completed Routefinder publication review.");
  } else if (!opportunity.verifiedAt || !published.length) {
    explanation.state = "low";
    explanation.missingInformation.push("A verification date or reviewed requirement is missing.");
  } else if (published.some((requirement) => requirement.conflict)) {
    explanation.state = "needs-checking";
    explanation.risks.push("Published sources conflict.");
  } else {
    explanation.reasons.push("The record has reviewed source information and a verification date.");
  }

  explanation.sourceFacts = requirementSourceFacts(published);
  return explanation;
}

export function evaluatePortfolioRole(
  eligibility: EligibilityState,
  fit: FitState,
  confidence: FactConfidence,
  portfolioSize: number,
): DecisionExplanation<PortfolioRole> {
  const explanation = baseExplanation<PortfolioRole>("needs-checking");

  if (confidence === "low" || confidence === "needs-checking" || eligibility === "needs-checking" || eligibility === "unknown") {
    explanation.missingInformation.push("More verified information is needed before assigning a firmer portfolio role.");
  } else if (eligibility === "appears-unmet") {
    explanation.state = "ambitious";
    explanation.risks.push("A published minimum currently appears unmet.");
  } else if ((eligibility === "appears-met" || eligibility === "may-be-met") && fit === "currently-strong") {
    explanation.state = portfolioSize >= 3 ? "currently-plausible" : "exploratory";
    explanation.reasons.push("Published minimums and current preferences appear reasonably aligned.");
  } else if (eligibility === "appears-met" && fit === "mixed") {
    explanation.state = "qualification-aligned-alternative";
    explanation.reasons.push("Published minimum qualifications appear aligned, while the currently assessed preference fit is mixed.");
    explanation.risks.push("This role does not indicate likelihood, competitiveness, or risk.");
  } else {
    explanation.state = "exploratory";
    explanation.reasons.push("This option could help diversify the current comparison.");
  }

  return explanation;
}

export function assessOpportunity(input: AssessmentInput): OpportunityAssessment {
  const requirementAssessment = input.requirementAssessment ?? assessOpportunityRequirements(
    input.opportunity,
    input.qualifications,
    input.profile.qualificationsComplete,
    input.evidenceLinks,
  );
  const eligibility = requirementAssessment.eligibility;
  const fit = evaluateFit(input.profile, input.opportunity);
  const readiness = evaluateReadinessAssessment(requirementAssessment);
  const informationConfidence = evaluateInformationConfidence(input.opportunity);
  const portfolioRole = evaluatePortfolioRole(
    eligibility.state,
    fit.state,
    informationConfidence.state,
    input.portfolioSize,
  );

  return { eligibility, fit, readiness, informationConfidence, portfolioRole };
}
