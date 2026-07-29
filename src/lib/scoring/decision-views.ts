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

export interface EvidenceLinkSummary {
  requirementId: string;
  coverage: EvidenceCoverage;
  confirmedByStudent: boolean;
}

export interface AssessmentInput {
  profile: StudentProfile;
  qualifications: Qualification[];
  opportunity: Opportunity;
  evidenceLinks: EvidenceLinkSummary[];
  portfolioSize: number;
}

const gradeValue: Record<string, number> = {
  "9": 13,
  "8": 12,
  "7": 11,
  "6": 10,
  "5": 9,
  "4": 8,
  "3": 7,
  "2": 6,
  "1": 5,
  "U": 0,
  "A*": 13,
  A: 12,
  B: 10,
  C: 8,
  D: 6,
  E: 4,
};

function baseExplanation<TState extends string>(state: TState): DecisionExplanation<TState> {
  return {
    state,
    reasons: [],
    risks: [],
    missingInformation: [],
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

function findQualification(requirement: Requirement, qualifications: Qualification[]) {
  const requiredSubject = String(requirement.structuredValue?.subject ?? "").toLowerCase();
  const requiredType = String(requirement.structuredValue?.qualificationType ?? "").toLowerCase();

  return qualifications.find((qualification) => {
    const subjectMatches = !requiredSubject || qualification.subject.toLowerCase().includes(requiredSubject);
    const typeMatches = !requiredType || qualification.qualificationType.toLowerCase().includes(requiredType);
    return subjectMatches && typeMatches;
  });
}

export function evaluateEligibility(
  opportunity: Opportunity,
  qualifications: Qualification[],
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

  let sawPredictedMatch = false;
  let sawUnknown = false;

  for (const requirement of hardRequirements) {
    const qualification = findQualification(requirement, qualifications);

    if (!qualification) {
      explanation.state = "appears-unmet";
      explanation.risks.push(`No recorded qualification currently matches: ${requirement.label}.`);
      return explanation;
    }

    if (qualification.status === "unknown" || !qualification.grade) {
      sawUnknown = true;
      explanation.missingInformation.push(`A grade or result is still unknown for ${qualification.subject}.`);
      continue;
    }

    const minimumGrade = String(requirement.structuredValue?.minimumGrade ?? "").toUpperCase();
    const recordedGrade = qualification.grade.toUpperCase();

    if (minimumGrade && gradeValue[recordedGrade] !== undefined && gradeValue[minimumGrade] !== undefined) {
      if (gradeValue[recordedGrade] < gradeValue[minimumGrade]) {
        explanation.state = "appears-unmet";
        explanation.risks.push(`${qualification.subject} is recorded below the published minimum in the available information.`);
        return explanation;
      }
    }

    if (qualification.status === "predicted") {
      sawPredictedMatch = true;
    }
  }

  if (sawUnknown) {
    explanation.state = "needs-checking";
    explanation.reasons.push("Some recorded qualifications align, but a material result is still unknown.");
  } else if (sawPredictedMatch) {
    explanation.state = "may-be-met";
    explanation.reasons.push("Recorded predicted grades appear to align with the reviewed minimums.");
  } else {
    explanation.state = "appears-met";
    explanation.reasons.push("Recorded achieved qualifications appear to align with the reviewed minimums.");
  }

  explanation.risks.push("Contextual, equivalent, or unrecorded requirements may still apply.");
  return explanation;
}

export function evaluateFit(profile: StudentProfile, opportunity: Opportunity): DecisionExplanation<FitState> {
  const explanation = baseExplanation<FitState>("mixed");
  let signals = 0;

  if (profile.sectors.includes(opportunity.sector)) {
    signals += 2;
    explanation.reasons.push(`The opportunity is in your selected ${opportunity.sector} sector.`);
  } else {
    explanation.risks.push("This sector is not currently selected in your readiness profile.");
  }

  const routeMatches =
    profile.routeIntent === "combined" ||
    (profile.routeIntent === "university" && opportunity.kind === "university-course") ||
    (profile.routeIntent === "apprenticeship" && opportunity.kind === "apprenticeship-vacancy");

  if (routeMatches) {
    signals += 1;
    explanation.reasons.push("The opportunity matches your current route intention.");
  } else {
    explanation.risks.push("The route type differs from your current intention, so it may be exploratory.");
  }

  if (!profile.homeRegion) {
    explanation.state = "insufficient-information";
    explanation.missingInformation.push("Add a broad home region to make location fit more useful.");
    return explanation;
  }

  if (profile.relocationPreference === "stay-local" && !opportunity.location.toLowerCase().includes(profile.homeRegion.toLowerCase())) {
    explanation.risks.push("The recorded location may not fit your current travel or relocation preference.");
    signals -= 1;
  }

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

  const linkByRequirement = new Map(evidenceLinks.map((link) => [link.requirementId, link]));
  const hardMissing = published.some(
    (requirement) => requirement.hardRequirement && linkByRequirement.get(requirement.id)?.coverage === "apparently-unmet",
  );
  const supported = published.filter((requirement) => linkByRequirement.get(requirement.id)?.coverage === "supported").length;
  const weak = published.filter((requirement) => linkByRequirement.get(requirement.id)?.coverage === "weak").length;
  const missing = published.length - supported - weak;

  if (hardMissing) {
    explanation.state = "urgent-gaps";
    explanation.risks.push("A hard requirement is currently marked as apparently unmet.");
  } else if (supported === published.length) {
    explanation.state = "well-supported";
    explanation.reasons.push("Every reviewed requirement has a student-confirmed evidence link.");
  } else if (supported > 0 || weak > 0) {
    explanation.state = "partly-supported";
    explanation.reasons.push(`${supported} requirement${supported === 1 ? "" : "s"} currently have strong evidence coverage.`);
    if (missing) {
      explanation.missingInformation.push(`${missing} requirement${missing === 1 ? "" : "s"} still need evidence or confirmation.`);
    }
  } else {
    explanation.state = "early-stage";
    explanation.missingInformation.push("No reviewed requirement has confirmed evidence coverage yet.");
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
    explanation.state = "lower-risk-backup";
    explanation.reasons.push("Published minimums appear aligned, while preference fit is mixed.");
  } else {
    explanation.state = "exploratory";
    explanation.reasons.push("This option could help diversify the current comparison.");
  }

  return explanation;
}

export function assessOpportunity(input: AssessmentInput): OpportunityAssessment {
  const eligibility = evaluateEligibility(input.opportunity, input.qualifications);
  const fit = evaluateFit(input.profile, input.opportunity);
  const readiness = evaluateReadiness(input.opportunity.requirements, input.evidenceLinks);
  const informationConfidence = evaluateInformationConfidence(input.opportunity);
  const portfolioRole = evaluatePortfolioRole(
    eligibility.state,
    fit.state,
    informationConfidence.state,
    input.portfolioSize,
  );

  return { eligibility, fit, readiness, informationConfidence, portfolioRole };
}
