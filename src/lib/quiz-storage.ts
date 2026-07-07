import type { CurrentStage, DebtPreference, GradeBand, QuizAnswers, WorkStyle } from "@/types";

export const QUIZ_ANSWERS_STORAGE_KEY = "routefinder.quizAnswers.v1";
export const QUIZ_ANSWERS_CHANGED_EVENT = "routefinder:quiz-answers-changed";

const currentStages: readonly CurrentStage[] = ["GCSE", "Year 12", "Year 13", "College", "Gap year", "Working"];
const gradeBands: readonly GradeBand[] = ["needs-building", "steady", "strong", "high"];
const debtPreferences: readonly DebtPreference[] = ["open", "some-concern", "avoid"];
const workStyles: readonly WorkStyle[] = ["academic", "practical", "creative", "people", "technical"];

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isWorkStyleArray(value: unknown): value is WorkStyle[] {
  return Array.isArray(value) && value.every((item) => isOneOf(item, workStyles));
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normaliseQuizAnswers(value: unknown): QuizAnswers | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const maxTravelMinutes = Number(candidate.maxTravelMinutes);
  const earnSoon = Number(candidate.earnSoon);

  if (
    !isOneOf(candidate.currentStage, currentStages) ||
    !isStringArray(candidate.subjects) ||
    !isOneOf(candidate.predictedGrades, gradeBands) ||
    !isStringArray(candidate.interests) ||
    typeof candidate.location !== "string" ||
    !Number.isFinite(maxTravelMinutes) ||
    !isOneOf(candidate.debtPreference, debtPreferences) ||
    !Number.isFinite(earnSoon) ||
    !isWorkStyleArray(candidate.workStyles) ||
    !isStringArray(candidate.constraints)
  ) {
    return null;
  }

  return {
    currentStage: candidate.currentStage,
    subjects: candidate.subjects.map((item) => item.trim()).filter(Boolean),
    predictedGrades: candidate.predictedGrades,
    interests: candidate.interests.map((item) => item.trim()).filter(Boolean),
    targetCareer: optionalString(candidate.targetCareer),
    targetCourse: optionalString(candidate.targetCourse),
    location: candidate.location.trim(),
    maxTravelMinutes: Math.max(10, Math.min(180, Math.round(maxTravelMinutes))),
    debtPreference: candidate.debtPreference,
    earnSoon: Math.max(1, Math.min(5, Math.round(earnSoon))),
    workStyles: candidate.workStyles,
    constraints: candidate.constraints.map((item) => item.trim()).filter(Boolean),
  };
}

export function loadQuizAnswers(): QuizAnswers | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(QUIZ_ANSWERS_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return normaliseQuizAnswers(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveQuizAnswers(answers: QuizAnswers) {
  window.localStorage.setItem(QUIZ_ANSWERS_STORAGE_KEY, JSON.stringify(answers));
  window.dispatchEvent(new Event(QUIZ_ANSWERS_CHANGED_EVENT));
}
