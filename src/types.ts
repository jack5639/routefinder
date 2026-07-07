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

export interface ScoredRoute extends RouteOption {
  scores: ScoreBreakdown;
  totalScore: number;
  explanation: {
    whyThisRouteFits: string[];
    watchOuts: string[];
    nextSteps: string[];
    backupOptions: string[];
    missingInfo: string[];
  };
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

export interface SimulatorChange {
  routeId: string;
  label: "improved" | "worsened" | "appeared" | "disappeared" | "steady";
  delta: number;
}
