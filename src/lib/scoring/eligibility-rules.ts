import { z } from "zod";

import type { Qualification } from "@/lib/mvp/types";

export type SupportedQualificationType = "a-level" | "gcse";

export type EligibilityRule =
  | {
      version: 1;
      type: "qualification-minimum";
      qualificationType: SupportedQualificationType;
      subject?: string;
      minimumGrade: string;
    }
  | {
      version: 1;
      type: "qualification-combination";
      qualificationType: SupportedQualificationType;
      minimumGrades: string[];
      subjectMinimums: Array<{ subject: string; minimumGrade: string }>;
    }
  | { version: 1; type: "all-of"; rules: EligibilityRule[] }
  | { version: 1; type: "any-of"; rules: EligibilityRule[] };

export type RuleOutcome = "met-achieved" | "met-predicted" | "unmet" | "unknown" | "unsupported-or-invalid";

export interface RuleEvaluation {
  outcome: RuleOutcome;
  messages: string[];
}

const qualificationTypeAliases: Record<string, SupportedQualificationType> = {
  "a level": "a-level",
  "a-level": "a-level",
  "a levels": "a-level",
  "a-levels": "a-level",
  gcse: "gcse",
  gcses: "gcse",
};

const subjectAliases: Record<string, string> = {
  math: "mathematics",
  maths: "mathematics",
  mathematics: "mathematics",
  "english language": "english language",
  "english-language": "english language",
};

const gradeValues: Record<SupportedQualificationType, Record<string, number>> = {
  "a-level": { "A*": 6, A: 5, B: 4, C: 3, D: 2, E: 1, U: 0 },
  gcse: { "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1, U: 0 },
};

const rawRuleSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      version: z.literal(1),
      type: z.literal("qualification-minimum"),
      qualificationType: z.string().trim().min(1).max(80),
      subject: z.string().trim().min(1).max(100).optional(),
      minimumGrade: z.string().trim().min(1).max(20),
    }),
    z.object({
      version: z.literal(1),
      type: z.literal("qualification-combination"),
      qualificationType: z.string().trim().min(1).max(80),
      minimumGrades: z.array(z.string().trim().min(1).max(20)).min(2).max(6),
      subjectMinimums: z.array(z.object({
        subject: z.string().trim().min(1).max(100),
        minimumGrade: z.string().trim().min(1).max(20),
      })).max(10).default([]),
    }),
    z.object({ version: z.literal(1), type: z.literal("all-of"), rules: z.array(rawRuleSchema).min(1).max(10) }),
    z.object({ version: z.literal(1), type: z.literal("any-of"), rules: z.array(rawRuleSchema).min(2).max(10) }),
  ]),
);

function normaliseText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normaliseQualificationType(value: string): SupportedQualificationType | undefined {
  return qualificationTypeAliases[normaliseText(value)];
}

export function normaliseSubject(value: string) {
  const normalised = normaliseText(value);
  return subjectAliases[normalised] ?? normalised;
}

export function normaliseGrade(qualificationType: SupportedQualificationType, value: string): string | undefined {
  const normalised = value.trim().toUpperCase();
  return gradeValues[qualificationType][normalised] === undefined ? undefined : normalised;
}

function normaliseMinimum(
  qualificationType: string,
  grade: string,
): { qualificationType: SupportedQualificationType; grade: string } | undefined {
  const type = normaliseQualificationType(qualificationType);
  if (!type) return undefined;
  const normalisedGrade = normaliseGrade(type, grade);
  return normalisedGrade ? { qualificationType: type, grade: normalisedGrade } : undefined;
}

function invalid(message: string): RuleEvaluation {
  return { outcome: "unsupported-or-invalid", messages: [message] };
}

function parseRule(value: unknown): EligibilityRule | undefined {
  const parsed = rawRuleSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const raw = parsed.data as Record<string, unknown>;

  if (raw.type === "qualification-minimum") {
    const rule = normaliseMinimum(String(raw.qualificationType), String(raw.minimumGrade));
    if (!rule) return undefined;
    return {
      version: 1,
      type: "qualification-minimum",
      qualificationType: rule.qualificationType,
      ...(raw.subject ? { subject: normaliseSubject(String(raw.subject)) } : {}),
      minimumGrade: rule.grade,
    };
  }

  if (raw.type === "qualification-combination") {
    const type = normaliseQualificationType(String(raw.qualificationType));
    if (!type) return undefined;
    const minimumGrades = (raw.minimumGrades as unknown[]).map((grade) => normaliseGrade(type, String(grade)));
    const subjectMinimums = (raw.subjectMinimums as Array<Record<string, unknown>>).map((minimum) => ({
      subject: normaliseSubject(String(minimum.subject)),
      minimumGrade: normaliseGrade(type, String(minimum.minimumGrade)),
    }));
    if (minimumGrades.some((grade) => !grade) || subjectMinimums.some((minimum) => !minimum.minimumGrade)) return undefined;
    if (new Set(subjectMinimums.map((minimum) => minimum.subject)).size !== subjectMinimums.length) return undefined;
    return {
      version: 1,
      type: "qualification-combination",
      qualificationType: type,
      minimumGrades: minimumGrades as string[],
      subjectMinimums: subjectMinimums as Array<{ subject: string; minimumGrade: string }>,
    };
  }

  const rules = (raw.rules as unknown[]).map(parseRule);
  if (rules.some((rule) => !rule)) return undefined;
  return { version: 1, type: raw.type as "all-of" | "any-of", rules: rules as EligibilityRule[] };
}

/** Parses the current persisted legacy shape or the versioned `eligibilityRule` shape. */
export function parseEligibilityRule(structuredValue: unknown): EligibilityRule | undefined {
  if (!structuredValue || typeof structuredValue !== "object" || Array.isArray(structuredValue)) return undefined;
  const value = structuredValue as Record<string, unknown>;
  if ("eligibilityRule" in value) return parseRule(value.eligibilityRule);
  if (
    typeof value.qualificationType !== "string" ||
    typeof value.minimumGrade !== "string" ||
    (value.subject !== undefined && typeof value.subject !== "string")
  ) return undefined;
  return parseRule({
    version: 1,
    type: "qualification-minimum",
    qualificationType: value.qualificationType,
    ...(value.subject ? { subject: value.subject } : {}),
    minimumGrade: value.minimumGrade,
  });
}

export function serialiseEligibilityRule(rule: EligibilityRule) {
  return { eligibilityRule: rule };
}

function combineAll(evaluations: RuleEvaluation[]): RuleEvaluation {
  const messages = evaluations.flatMap((evaluation) => evaluation.messages);
  if (evaluations.some((evaluation) => evaluation.outcome === "unsupported-or-invalid")) return { outcome: "unsupported-or-invalid", messages };
  if (evaluations.some((evaluation) => evaluation.outcome === "unknown")) return { outcome: "unknown", messages };
  if (evaluations.some((evaluation) => evaluation.outcome === "unmet")) return { outcome: "unmet", messages };
  return { outcome: evaluations.some((evaluation) => evaluation.outcome === "met-predicted") ? "met-predicted" : "met-achieved", messages };
}

function combineAny(evaluations: RuleEvaluation[]): RuleEvaluation {
  const messages = evaluations.flatMap((evaluation) => evaluation.messages);
  if (evaluations.some((evaluation) => evaluation.outcome === "unsupported-or-invalid")) return { outcome: "unsupported-or-invalid", messages };
  if (evaluations.some((evaluation) => evaluation.outcome === "met-achieved")) return { outcome: "met-achieved", messages };
  if (evaluations.some((evaluation) => evaluation.outcome === "met-predicted")) return { outcome: "met-predicted", messages };
  if (evaluations.every((evaluation) => evaluation.outcome === "unmet")) return { outcome: "unmet", messages };
  return { outcome: "unknown", messages };
}

function evaluateMinimum(
  rule: Extract<EligibilityRule, { type: "qualification-minimum" }>,
  qualifications: Qualification[],
  qualificationsComplete: boolean,
): RuleEvaluation {
  if (qualifications.some((qualification) => !normaliseQualificationType(qualification.qualificationType))) {
    return invalid("A recorded qualification uses a type Routefinder cannot compare safely.");
  }
  const sameType = qualifications.filter((qualification) => normaliseQualificationType(qualification.qualificationType) === rule.qualificationType);
  const candidates = sameType.filter((qualification) => !rule.subject || normaliseSubject(qualification.subject) === rule.subject);
  if (!candidates.length) {
    return qualificationsComplete
      ? { outcome: "unmet", messages: [`No recorded qualification currently matches this minimum${rule.subject ? ` for ${rule.subject}` : ""}.`] }
      : { outcome: "unknown", messages: [`Your qualification record is not complete, so Routefinder cannot treat a missing${rule.subject ? ` ${rule.subject}` : ""} qualification as absent.`] };
  }

  const outcomes = candidates.map((qualification): RuleEvaluation => {
    if (qualification.status === "unknown" || !qualification.grade) {
      return { outcome: "unknown", messages: [`A grade or result is still unknown for ${qualification.subject}.`] };
    }
    const grade = normaliseGrade(rule.qualificationType, qualification.grade);
    if (!grade) return invalid(`The recorded grade for ${qualification.subject} is not supported for this qualification type.`);
    if (gradeValues[rule.qualificationType][grade] < gradeValues[rule.qualificationType][rule.minimumGrade]) {
      return { outcome: "unmet", messages: [`${qualification.subject} is recorded below the published minimum.`] };
    }
    return {
      outcome: qualification.status === "achieved" ? "met-achieved" : "met-predicted",
      messages: [`${qualification.subject} appears to meet the published minimum.`],
    };
  });
  return combineAny(outcomes);
}

function evaluateCombination(
  rule: Extract<EligibilityRule, { type: "qualification-combination" }>,
  qualifications: Qualification[],
  qualificationsComplete: boolean,
): RuleEvaluation {
  if (qualifications.some((qualification) => !normaliseQualificationType(qualification.qualificationType))) {
    return invalid("A recorded qualification uses a type Routefinder cannot compare safely.");
  }
  const candidates = qualifications.filter((qualification) => normaliseQualificationType(qualification.qualificationType) === rule.qualificationType);
  const gradeRequirements = [...rule.minimumGrades].sort((a, b) => gradeValues[rule.qualificationType][b] - gradeValues[rule.qualificationType][a]);
  const known = candidates.flatMap((qualification) => {
    if (qualification.status === "unknown" || !qualification.grade) return [];
    const grade = normaliseGrade(rule.qualificationType, qualification.grade);
    return grade ? [{ qualification, grade }] : [];
  });
  const hasUnknown = candidates.some((qualification) => qualification.status === "unknown" || !qualification.grade);
  const hasInvalid = candidates.some((qualification) => qualification.status !== "unknown" && qualification.grade && !normaliseGrade(rule.qualificationType, qualification.grade));

  if (hasInvalid) return invalid("A recorded grade in this qualification combination is not supported.");
  if (candidates.length < rule.minimumGrades.length) {
    return hasUnknown || !qualificationsComplete
      ? { outcome: "unknown", messages: ["A grade or result needed for this qualification combination is still unknown."] }
      : { outcome: "unmet", messages: ["There are not enough recorded qualifications to meet this published combination."] };
  }

  function selections<T>(items: T[], size: number, start = 0, selected: T[] = []): T[][] {
    if (selected.length === size) return [selected];
    const result: T[][] = [];
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      result.push(...selections(items, size, index + 1, [...selected, items[index]]));
    }
    return result;
  }

  for (const selected of selections(known, rule.minimumGrades.length)) {
    const sortedGrades = selected.map(({ grade }) => grade).sort((a, b) => gradeValues[rule.qualificationType][b] - gradeValues[rule.qualificationType][a]);
    const gradesMeet = gradeRequirements.every((minimum, index) => gradeValues[rule.qualificationType][sortedGrades[index]] >= gradeValues[rule.qualificationType][minimum]);
    const subjectsMeet = rule.subjectMinimums.every((minimum) => selected.some(({ qualification, grade }) =>
      normaliseSubject(qualification.subject) === minimum.subject && gradeValues[rule.qualificationType][grade] >= gradeValues[rule.qualificationType][minimum.minimumGrade],
    ));
    if (gradesMeet && subjectsMeet) {
      return {
        outcome: selected.some(({ qualification }) => qualification.status === "predicted") ? "met-predicted" : "met-achieved",
        messages: ["Recorded qualifications appear to meet this published combination."],
      };
    }
  }

  if (hasUnknown) return { outcome: "unknown", messages: ["A grade or result needed for this qualification combination is still unknown."] };
  return { outcome: "unmet", messages: ["The recorded qualifications are below this published combination."] };
}

export function evaluateEligibilityRule(
  rule: EligibilityRule,
  qualifications: Qualification[],
  qualificationsComplete = true,
): RuleEvaluation {
  if (rule.type === "qualification-minimum") return evaluateMinimum(rule, qualifications, qualificationsComplete);
  if (rule.type === "qualification-combination") return evaluateCombination(rule, qualifications, qualificationsComplete);
  const evaluations = rule.rules.map((child) => evaluateEligibilityRule(child, qualifications, qualificationsComplete));
  return rule.type === "all-of" ? combineAll(evaluations) : combineAny(evaluations);
}
