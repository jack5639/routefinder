export type RouteType =
  | "University degree"
  | "Degree apprenticeship"
  | "Higher apprenticeship"
  | "College course"
  | "Foundation year"
  | "Access course"
  | "Direct work/training"
  | "Portfolio/project route";

export type CurrentStage =
  | "GCSE"
  | "Year 12"
  | "Year 13"
  | "College"
  | "Gap year"
  | "Working";

export type GradeBand = "needs-building" | "steady" | "strong" | "high";

export type DebtPreference = "open" | "some-concern" | "avoid";

export type WorkStyle = "academic" | "practical" | "creative" | "people" | "technical";

export type CatalogSource = "discoverUni" | "ucas" | "findApprenticeshipEngland";

export type SourceRunStatus = "running" | "success" | "failed";

export type CatalogueFreshness = "fresh" | "stale" | "missing" | "error" | "demo";

export type SourceKind = "demo" | "derived-family" | "university-course" | "apprenticeship-vacancy";

export interface SourceRun {
  id: number;
  source: CatalogSource;
  status: SourceRunStatus;
  startedAt: string;
  finishedAt?: string;
  recordsSeen: number;
  recordsChanged: number;
  errorMessage?: string;
  snapshotPath?: string;
}

export interface CatalogSourceStatus {
  source: CatalogSource;
  label: string;
  freshnessStatus: CatalogueFreshness;
  lastSuccessfulSync?: string;
  lastAttemptedSync?: string;
  recordsSeen: number;
  recordsChanged: number;
  errorMessage?: string;
  staleAfterMinutes: number;
}

export interface UniversityCourse {
  id: string;
  source: CatalogSource;
  sourceId: string;
  title: string;
  providerName: string;
  campus?: string;
  qualification?: string;
  duration?: string;
  studyMode?: string;
  startDate?: string;
  tariff?: string;
  courseUrl?: string;
  applyUrl?: string;
  subject?: string;
  tags: string[];
  lastSeenAt: string;
}

export interface ApprenticeshipVacancy {
  id: string;
  source: CatalogSource;
  sourceId: string;
  title: string;
  employerName?: string;
  trainingProvider?: string;
  apprenticeshipLevel?: string;
  location?: string;
  wage?: string;
  closingDate?: string;
  startDate?: string;
  vacancyUrl?: string;
  status: "open" | "closed" | "unknown";
  tags: string[];
  lastSeenAt: string;
}

export interface RouteOpportunity {
  id: string;
  source: CatalogSource;
  kind: "university-course" | "apprenticeship-vacancy";
  title: string;
  providerName?: string;
  employerName?: string;
  location?: string;
  summary: string;
  deadline?: string;
  startDate?: string;
  costOrPay?: string;
  sourceUrl?: string;
  applyUrl?: string;
  freshnessStatus: CatalogueFreshness;
  lastSeenAt: string;
}

export interface QuizAnswers {
  currentStage: CurrentStage;
  subjects: string[];
  predictedGrades: GradeBand;
  interests: string[];
  targetCareer?: string;
  targetCourse?: string;
  location: string;
  maxTravelMinutes: number;
  debtPreference: DebtPreference;
  earnSoon: number;
  workStyles: WorkStyle[];
  constraints: string[];
}

export interface RouteOption {
  id: string;
  title: string;
  type: RouteType;
  summary: string;
  sourceKind?: SourceKind;
  sourceUrl?: string;
  applyUrl?: string;
  deadline?: string;
  lastChecked?: string;
  evidenceLevel?: "demo" | "partial" | "source-backed";
  opportunityCount?: number;
  lastSyncedAt?: string;
  freshnessStatus?: CatalogueFreshness;
  sourceRecordIds?: string[];
  opportunities?: RouteOpportunity[];
  costOrPaySummary?: string;
  bursaryOrSupportSummary?: string;
  relatedInterests: string[];
  relatedCareers: string[];
  relatedCourses: string[];
  preferredGrades: GradeBand[];
  maxTypicalTravelMinutes: number;
  debtLevel: "low" | "medium" | "high";
  earnSoonLevel: number;
  workStyles: WorkStyle[];
  constraintsSupported: string[];
  why: string[];
  risks: string[];
  nextSteps: string[];
  backupOptions: string[];
}

export interface ScoreBreakdown {
  fit: number;
  feasibility: number;
  constraint: number;
  confidence: number;
}

export type RouteFeedbackActionId =
  | "like"
  | "maybe"
  | "not-for-me"
  | "too-academic"
  | "too-expensive"
  | "too-far"
  | "too-competitive"
  | "more-practical-routes"
  | "higher-earning-routes"
  | "safer-backup-options"
  | "lower-debt-routes";

export interface RouteFeedbackEntry {
  routeId: string;
  actionIds: RouteFeedbackActionId[];
  updatedAt: string;
}

export interface RouteFeedbackState {
  entries: Record<string, RouteFeedbackEntry>;
}

export interface RouteFeedbackAdjustment {
  delta: number;
  originalTotalScore: number;
  activeActionLabels: string[];
  reasons: string[];
}

export interface ScoredRoute extends RouteOption {
  scores: ScoreBreakdown;
  totalScore: number;
  feedbackAdjustment?: RouteFeedbackAdjustment;
  explanation: {
    whyThisRouteFits: string[];
    watchOuts: string[];
    nextSteps: string[];
    backupOptions: string[];
    missingInfo: string[];
  };
}

export interface RecommendationRequest {
  answers: QuizAnswers;
  limit?: number;
  includeOpportunities?: boolean;
}

export interface RecommendationResponse {
  generatedAt: string;
  usedFallback: boolean;
  freshness: CatalogSourceStatus[];
  routes: ScoredRoute[];
}

export type DecisionBoardCategoryId =
  | "strong-fit"
  | "realistic"
  | "stretch"
  | "safer-backup"
  | "worth-exploring";

export interface DecisionBoardCategoryDefinition {
  id: DecisionBoardCategoryId;
  title: string;
  summary: string;
}

export interface DecisionBoardGroup extends DecisionBoardCategoryDefinition {
  routes: ScoredRoute[];
}

export interface RoadmapStep {
  title: string;
  timeframe: string;
  detail: string;
}

export interface RoadmapTemplate {
  routeId: string;
  heading: string;
  overview: string;
  steps: RoadmapStep[];
}

export type RoadmapTrustLabel =
  | "Based on your quiz"
  | "Based on demo route data"
  | "Needs checking"
  | "Suggested next action";

export type GeneratedRoadmapSectionId =
  | "this-week"
  | "this-month"
  | "before-applying"
  | "unlock-options"
  | "backup-plan";

export interface RoadmapCheck {
  label: string;
  detail: string;
  trustLabel: RoadmapTrustLabel;
}

export interface RoadmapTask {
  title: string;
  detail: string;
  timeframe: string;
  whyItMatters: string;
  evidenceToGather: string;
  checks: RoadmapCheck[];
  trustLabels: RoadmapTrustLabel[];
}

export interface RoadmapSection {
  id: GeneratedRoadmapSectionId;
  title: string;
  summary: string;
  tasks: RoadmapTask[];
}

export interface RoadmapSourceWarning {
  label: string;
  detail: string;
  trustLabel: Extract<RoadmapTrustLabel, "Based on demo route data" | "Needs checking">;
}

export interface RoadmapFollowUpPrompt {
  id: "deadlinePressure" | "supportNeeds" | "weeklyTime" | "existingEvidence";
  label: string;
  question: string;
  whyItHelps: string;
}

export interface RoadmapFollowUpAnswers {
  deadlinePressure?: string;
  supportNeeds?: string;
  weeklyTime?: string;
  existingEvidence?: string;
}

export interface GeneratedRoadmap {
  routeId: string;
  generatedAt: string;
  headline: string;
  profileSummary: string;
  confidenceNote: string;
  sections: RoadmapSection[];
  watchOuts: string[];
  backupOptions: string[];
  sourceWarnings: RoadmapSourceWarning[];
  followUpPrompts: RoadmapFollowUpPrompt[];
}

export interface SavedRoadmap {
  routeId: string;
  savedAt: string;
  generatedRoadmap?: GeneratedRoadmap;
}

export type SimulatorMovementLabel = "improved" | "worsened" | "appeared" | "disappeared" | "steady";

export type SimulatorFactor = "grades" | "travel" | "debt" | "target" | "interests" | "day-to-day";

export type SimulatorFactorPatch = Partial<
  Pick<
    QuizAnswers,
    | "predictedGrades"
    | "maxTravelMinutes"
    | "debtPreference"
    | "targetCareer"
    | "targetCourse"
    | "interests"
    | "workStyles"
    | "earnSoon"
  >
>;

export interface SimulatorChange {
  routeId: string;
  label: SimulatorMovementLabel;
  delta: number;
  baselineScore: number | null;
  changedScore: number | null;
  baselineRank: number | null;
  changedRank: number | null;
  explanations: string[];
}

export interface SimulatorComparison {
  baselineRoutes: ScoredRoute[];
  changedRoutes: ScoredRoute[];
  changes: SimulatorChange[];
}
