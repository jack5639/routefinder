export const launchSectors = ["technology", "engineering", "business", "finance"] as const;
export type LaunchSector = (typeof launchSectors)[number];

export type RouteIntent = "university" | "apprenticeship" | "combined";
export type RelocationPreference = "stay-local" | "could-relocate" | "unsure";
export type QualificationStatus = "predicted" | "achieved" | "unknown";
export type OpportunityKind = "university-course" | "apprenticeship-vacancy" | "external";
export type OpportunityState = "open" | "closed" | "unknown";
export type PublicationState = "draft" | "review" | "published" | "withdrawn";
export type FactConfidence = "high" | "medium" | "low" | "needs-checking";

export type EligibilityState = "appears-met" | "may-be-met" | "appears-unmet" | "needs-checking" | "unknown";
export type FitState = "currently-strong" | "mixed" | "currently-weaker" | "insufficient-information";
export type ReadinessState = "well-supported" | "partly-supported" | "early-stage" | "urgent-gaps" | "unknown";
export type PortfolioRole =
  | "ambitious"
  | "currently-plausible"
  | "lower-risk-backup"
  | "exploratory"
  | "needs-checking";

export type EvidenceCoverage = "supported" | "weak" | "missing" | "apparently-unmet" | "needs-confirmation";
export type ApplicationStage =
  | "planned"
  | "preparing"
  | "submitted"
  | "online-assessment"
  | "interview"
  | "assessment-centre"
  | "decision"
  | "offer"
  | "declined"
  | "withdrawn";

export interface StudentProfile {
  id: string;
  currentStage: "Year 12" | "Year 13";
  applicationCycle: number;
  homeRegion: string;
  maxTravelMinutes: number;
  relocationPreference: RelocationPreference;
  routeIntent: RouteIntent;
  sectors: LaunchSector[];
  workStyles: string[];
  financialPreference: "open" | "cost-aware" | "prefer-lower-debt";
  constraints: string[];
  experienceSummary?: string;
}

export interface Qualification {
  id: string;
  subject: string;
  qualificationType: string;
  grade?: string;
  status: QualificationStatus;
}

export interface Requirement {
  id: string;
  opportunityId: string;
  kind: "qualification" | "subject" | "grade" | "experience" | "skill" | "application-stage" | "other";
  label: string;
  structuredValue?: Record<string, unknown>;
  supportingText: string;
  sourceUrl: string;
  retrievedAt: string;
  verifiedAt?: string;
  freshness: FactConfidence;
  conflict: boolean;
  publicationState: PublicationState;
  hardRequirement: boolean;
}

export interface Opportunity {
  id: string;
  kind: OpportunityKind;
  sector: LaunchSector;
  title: string;
  providerName: string;
  location: string;
  summary: string;
  deadline?: string;
  applicationUrl: string;
  sourceUrl: string;
  retrievedAt: string;
  verifiedAt?: string;
  freshness: FactConfidence;
  state: OpportunityState;
  publicationState: PublicationState;
  requirements: Requirement[];
}

export interface DecisionExplanation<TState extends string> {
  state: TState;
  reasons: string[];
  risks: string[];
  missingInformation: string[];
  sourceFacts: Array<{ label: string; sourceUrl: string; verifiedAt?: string }>;
  directCheckAction: string;
}

export interface OpportunityAssessment {
  eligibility: DecisionExplanation<EligibilityState>;
  fit: DecisionExplanation<FitState>;
  readiness: DecisionExplanation<ReadinessState>;
  informationConfidence: DecisionExplanation<FactConfidence>;
  portfolioRole: DecisionExplanation<PortfolioRole>;
}
