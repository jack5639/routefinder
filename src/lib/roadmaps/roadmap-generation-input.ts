import type { QuizAnswers, RoadmapFollowUpAnswers, RouteOption, ScoredRoute } from "@/types";

export type RoadmapGenerationInput = {
  generatedAt: string;
  route: {
    id: string;
    title: string;
    type: RouteOption["type"];
    summary: string;
    evidenceLevel: RouteOption["evidenceLevel"];
    requirementEvidenceStatus: RouteOption["requirementEvidenceStatus"];
    freshnessStatus: RouteOption["freshnessStatus"];
    lastChecked: string | undefined;
    deadline: string | undefined;
    sourceUrl: string | undefined;
    applyUrl: string | undefined;
    costOrPaySummary: string | undefined;
    bursaryOrSupportSummary: string | undefined;
    preferredGrades: RouteOption["preferredGrades"];
    maxTypicalTravelMinutes: number;
    debtLevel: RouteOption["debtLevel"];
    earnSoonLevel: number;
    relatedInterests: string[];
    relatedCareers: string[];
    relatedCourses: string[];
    workStyles: RouteOption["workStyles"];
    why: string[];
    risks: string[];
    nextSteps: string[];
    backupOptions: string[];
  };
  quizProfile: {
    currentStage: QuizAnswers["currentStage"];
    subjects: string[];
    predictedGrades: QuizAnswers["predictedGrades"];
    interests: string[];
    targetCareer: string | undefined;
    targetCourse: string | undefined;
    location: string;
    maxTravelMinutes: number;
    debtPreference: QuizAnswers["debtPreference"];
    earnSoon: number;
    workStyles: QuizAnswers["workStyles"];
    constraints: string[];
  };
  scoring: {
    totalScore: number;
    fit: number;
    eligibility: number;
    readiness: number;
    feasibility: number;
    constraint: number;
    confidence: number;
    whyThisRouteFits: string[];
    watchOuts: string[];
    nextSteps: string[];
    backupOptions: string[];
    missingInfo: string[];
    confidenceLimitations: string[];
  };
  followUps: RoadmapFollowUpAnswers;
};

const followUpFields: (keyof RoadmapFollowUpAnswers)[] = [
  "deadlinePressure",
  "supportNeeds",
  "weeklyTime",
  "existingEvidence",
];

function cleanOptionalFollowUp(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleanValue = value.trim().replace(/\s+/g, " ");

  if (!cleanValue) {
    return undefined;
  }

  return cleanValue.slice(0, 240);
}

export function normaliseRoadmapFollowUpAnswers(value: unknown): RoadmapFollowUpAnswers {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, unknown>;

  return followUpFields.reduce<RoadmapFollowUpAnswers>((answers, field) => {
    const cleanValue = cleanOptionalFollowUp(candidate[field]);

    if (cleanValue) {
      answers[field] = cleanValue;
    }

    return answers;
  }, {});
}

export function buildRoadmapGenerationInput({
  route,
  scored,
  answers,
  followUps,
  generatedAt = new Date().toISOString(),
}: {
  route: RouteOption;
  scored: ScoredRoute;
  answers: QuizAnswers;
  followUps?: RoadmapFollowUpAnswers;
  generatedAt?: string;
}): RoadmapGenerationInput {
  return {
    generatedAt,
    route: {
      id: route.id,
      title: route.title,
      type: route.type,
      summary: route.summary,
      evidenceLevel: route.evidenceLevel,
      requirementEvidenceStatus: route.requirementEvidenceStatus,
      freshnessStatus: route.freshnessStatus,
      lastChecked: route.lastChecked,
      deadline: route.deadline,
      sourceUrl: route.sourceUrl,
      applyUrl: route.applyUrl,
      costOrPaySummary: route.costOrPaySummary,
      bursaryOrSupportSummary: route.bursaryOrSupportSummary,
      preferredGrades: [...route.preferredGrades],
      maxTypicalTravelMinutes: route.maxTypicalTravelMinutes,
      debtLevel: route.debtLevel,
      earnSoonLevel: route.earnSoonLevel,
      relatedInterests: [...route.relatedInterests],
      relatedCareers: [...route.relatedCareers],
      relatedCourses: [...route.relatedCourses],
      workStyles: [...route.workStyles],
      why: [...route.why],
      risks: [...route.risks],
      nextSteps: [...route.nextSteps],
      backupOptions: [...route.backupOptions],
    },
    quizProfile: {
      currentStage: answers.currentStage,
      subjects: [...answers.subjects],
      predictedGrades: answers.predictedGrades,
      interests: [...answers.interests],
      targetCareer: answers.targetCareer,
      targetCourse: answers.targetCourse,
      location: answers.location,
      maxTravelMinutes: answers.maxTravelMinutes,
      debtPreference: answers.debtPreference,
      earnSoon: answers.earnSoon,
      workStyles: [...answers.workStyles],
      constraints: [...answers.constraints],
    },
    scoring: {
      totalScore: scored.totalScore,
      fit: scored.scores.fit,
      eligibility: scored.scores.eligibility,
      readiness: scored.scores.readiness,
      feasibility: scored.scores.feasibility,
      constraint: scored.scores.constraint,
      confidence: scored.scores.confidence,
      whyThisRouteFits: [...scored.explanation.whyThisRouteFits],
      watchOuts: [...scored.explanation.watchOuts],
      nextSteps: [...scored.explanation.nextSteps],
      backupOptions: [...scored.explanation.backupOptions],
      missingInfo: [...scored.explanation.missingInfo],
      confidenceLimitations: [...scored.explanation.confidenceLimitations],
    },
    followUps: normaliseRoadmapFollowUpAnswers(followUps),
  };
}
