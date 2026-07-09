import type {
  GeneratedRoadmap,
  GeneratedRoadmapSectionId,
  RoadmapCheck,
  RoadmapFollowUpPrompt,
  RoadmapSection,
  RoadmapSourceWarning,
  RoadmapTask,
  RoadmapTrustLabel,
} from "@/types";

type ValidationOptions = {
  routeId?: string;
  backupOptions?: string[];
};

export type GeneratedRoadmapValidationResult =
  | {
      ok: true;
      roadmap: GeneratedRoadmap;
    }
  | {
      ok: false;
      errors: string[];
    };

export const roadmapTrustLabels: readonly RoadmapTrustLabel[] = [
  "Based on your quiz",
  "Based on demo route data",
  "Needs checking",
  "Suggested next action",
];

export const generatedRoadmapSectionDefinitions: readonly {
  id: GeneratedRoadmapSectionId;
  title: string;
}[] = [
  { id: "this-week", title: "This week" },
  { id: "this-month", title: "This month" },
  { id: "before-applying", title: "Before applying/enrolling" },
  { id: "unlock-options", title: "What could unlock more options" },
  { id: "backup-plan", title: "Backup plan" },
];

const followUpPromptIds: readonly RoadmapFollowUpPrompt["id"][] = [
  "deadlinePressure",
  "supportNeeds",
  "weeklyTime",
  "existingEvidence",
];

const sourceWarningTrustLabels: readonly RoadmapSourceWarning["trustLabel"][] = [
  "Based on demo route data",
  "Needs checking",
];

const bannedOutputPatterns = [
  /\bbest route\b/i,
  /\byou should\b/i,
  /\byou cannot\b/i,
  /\byou can't\b/i,
  /\bnot smart enough\b/i,
  /\bcannot do this\b/i,
  /\bcan't do this\b/i,
  /\bguaranteed\b/i,
  /\bdefinitely\b/i,
  /\bwill get\b/i,
  /\bwill be accepted\b/i,
  /\bplace is available\b/i,
  /\bvacancy is open\b/i,
  /https?:\/\//i,
  /\b\d{4}-\d{2}-\d{2}\b/,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim().replace(/\s+/g, " ");

  if (!cleanValue || cleanValue.length > maxLength) {
    return null;
  }

  return cleanValue;
}

function cleanStringArray(value: unknown, minLength: number, maxLength: number, maxItemLength: number) {
  if (!Array.isArray(value) || value.length < minLength || value.length > maxLength) {
    return null;
  }

  const cleanValues = value
    .map((item) => cleanString(item, maxItemLength))
    .filter((item): item is string => Boolean(item));

  if (cleanValues.length !== value.length) {
    return null;
  }

  return cleanValues;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function cleanChecks(value: unknown): RoadmapCheck[] | null {
  if (!Array.isArray(value) || value.length > 2) {
    return null;
  }

  const checks = value.map((item) => {
    if (!isRecord(item)) {
      return null;
    }

    const label = cleanString(item.label, 60);
    const detail = cleanString(item.detail, 240);

    if (!label || !detail || !isOneOf(item.trustLabel, roadmapTrustLabels)) {
      return null;
    }

    return {
      label,
      detail,
      trustLabel: item.trustLabel,
    };
  });

  if (checks.some((item) => item === null)) {
    return null;
  }

  return checks as RoadmapCheck[];
}

function cleanTrustLabels(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    return null;
  }

  const labels = value.filter((item): item is RoadmapTrustLabel => isOneOf(item, roadmapTrustLabels));
  const uniqueLabels = Array.from(new Set(labels));

  if (labels.length !== value.length || uniqueLabels.length !== labels.length) {
    return null;
  }

  return labels;
}

function cleanTask(value: unknown): RoadmapTask | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = cleanString(value.title, 80);
  const detail = cleanString(value.detail, 420);
  const timeframe = cleanString(value.timeframe, 80);
  const whyItMatters = cleanString(value.whyItMatters, 280);
  const evidenceToGather = cleanString(value.evidenceToGather, 240);
  const checks = cleanChecks(value.checks);
  const trustLabels = cleanTrustLabels(value.trustLabels);

  if (!title || !detail || !timeframe || !whyItMatters || !evidenceToGather || !checks || !trustLabels) {
    return null;
  }

  return {
    title,
    detail,
    timeframe,
    whyItMatters,
    evidenceToGather,
    checks,
    trustLabels,
  };
}

function cleanSection(value: unknown, index: number): RoadmapSection | null {
  if (!isRecord(value)) {
    return null;
  }

  const expectedSection = generatedRoadmapSectionDefinitions[index];
  const summary = cleanString(value.summary, 240);

  if (value.id !== expectedSection.id || value.title !== expectedSection.title || !summary) {
    return null;
  }

  if (!Array.isArray(value.tasks) || value.tasks.length < 2 || value.tasks.length > 4) {
    return null;
  }

  const tasks = value.tasks.map(cleanTask);

  if (tasks.some((task) => task === null)) {
    return null;
  }

  return {
    id: expectedSection.id,
    title: expectedSection.title,
    summary,
    tasks: tasks as RoadmapTask[],
  };
}

function cleanSourceWarnings(value: unknown): RoadmapSourceWarning[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    return null;
  }

  const sourceWarnings = value.map((item) => {
    if (!isRecord(item)) {
      return null;
    }

    const label = cleanString(item.label, 80);
    const detail = cleanString(item.detail, 280);

    if (!label || !detail || !isOneOf(item.trustLabel, sourceWarningTrustLabels)) {
      return null;
    }

    return {
      label,
      detail,
      trustLabel: item.trustLabel,
    };
  });

  if (sourceWarnings.some((item) => item === null)) {
    return null;
  }

  return sourceWarnings as RoadmapSourceWarning[];
}

function cleanFollowUpPrompts(value: unknown): RoadmapFollowUpPrompt[] | null {
  if (!Array.isArray(value) || value.length > 4) {
    return null;
  }

  const seenIds = new Set<string>();
  const prompts = value.map((item) => {
    if (!isRecord(item) || !isOneOf(item.id, followUpPromptIds) || seenIds.has(item.id)) {
      return null;
    }

    seenIds.add(item.id);

    const label = cleanString(item.label, 80);
    const question = cleanString(item.question, 180);
    const whyItHelps = cleanString(item.whyItHelps, 220);

    if (!label || !question || !whyItHelps) {
      return null;
    }

    return {
      id: item.id,
      label,
      question,
      whyItHelps,
    };
  });

  if (prompts.some((item) => item === null)) {
    return null;
  }

  return prompts as RoadmapFollowUpPrompt[];
}

function collectUserFacingText(roadmap: GeneratedRoadmap) {
  return [
    roadmap.headline,
    roadmap.profileSummary,
    roadmap.confidenceNote,
    ...roadmap.sections.flatMap((section) => [
      section.title,
      section.summary,
      ...section.tasks.flatMap((task) => [
        task.title,
        task.detail,
        task.timeframe,
        task.whyItMatters,
        task.evidenceToGather,
        ...task.checks.flatMap((check) => [check.label, check.detail]),
      ]),
    ]),
    ...roadmap.watchOuts,
    ...roadmap.backupOptions,
    ...roadmap.sourceWarnings.flatMap((warning) => [warning.label, warning.detail]),
    ...roadmap.followUpPrompts.flatMap((prompt) => [prompt.label, prompt.question, prompt.whyItHelps]),
  ];
}

function findSafetyErrors(roadmap: GeneratedRoadmap) {
  const textValues = collectUserFacingText(roadmap);
  const errors: string[] = [];

  bannedOutputPatterns.forEach((pattern) => {
    if (textValues.some((text) => pattern.test(text))) {
      errors.push(`Roadmap output contains blocked wording: ${pattern.toString()}`);
    }
  });

  return errors;
}

export function validateGeneratedRoadmap(
  value: unknown,
  options: ValidationOptions = {},
): GeneratedRoadmapValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      errors: ["Roadmap output was not an object."],
    };
  }

  const routeId = cleanString(value.routeId, 120);
  const generatedAt = cleanString(value.generatedAt, 80);
  const headline = cleanString(value.headline, 120);
  const profileSummary = cleanString(value.profileSummary, 360);
  const confidenceNote = cleanString(value.confidenceNote, 360);
  const watchOuts = cleanStringArray(value.watchOuts, 1, 6, 260);
  const backupOptions = cleanStringArray(value.backupOptions, 1, 6, 120);
  const sourceWarnings = cleanSourceWarnings(value.sourceWarnings);
  const followUpPrompts = cleanFollowUpPrompts(value.followUpPrompts);

  if (!routeId) {
    errors.push("Roadmap routeId is missing or invalid.");
  }

  if (options.routeId && routeId && routeId !== options.routeId) {
    errors.push("Roadmap routeId does not match the requested route.");
  }

  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) {
    errors.push("Roadmap generatedAt is missing or invalid.");
  }

  if (!headline || !profileSummary || !confidenceNote) {
    errors.push("Roadmap summary fields are missing or invalid.");
  }

  if (!Array.isArray(value.sections) || value.sections.length !== generatedRoadmapSectionDefinitions.length) {
    errors.push("Roadmap must include exactly five sections.");
  }

  const sections = Array.isArray(value.sections)
    ? value.sections.map((section, index) => cleanSection(section, index))
    : [];

  if (sections.some((section) => section === null)) {
    errors.push("One or more roadmap sections are invalid.");
  }

  if (!watchOuts) {
    errors.push("Roadmap watchOuts are missing or invalid.");
  }

  if (!backupOptions) {
    errors.push("Roadmap backupOptions are missing or invalid.");
  }

  if (!sourceWarnings) {
    errors.push("Roadmap sourceWarnings are missing or invalid.");
  }

  if (!followUpPrompts) {
    errors.push("Roadmap followUpPrompts are invalid.");
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
    };
  }

  const roadmap: GeneratedRoadmap = {
    routeId: routeId as string,
    generatedAt: generatedAt as string,
    headline: headline as string,
    profileSummary: profileSummary as string,
    confidenceNote: confidenceNote as string,
    sections: sections as RoadmapSection[],
    watchOuts: watchOuts as string[],
    backupOptions: options.backupOptions?.length ? [...options.backupOptions] : (backupOptions as string[]),
    sourceWarnings: sourceWarnings as RoadmapSourceWarning[],
    followUpPrompts: followUpPrompts as RoadmapFollowUpPrompt[],
  };

  const safetyErrors = findSafetyErrors(roadmap);

  if (safetyErrors.length) {
    return {
      ok: false,
      errors: safetyErrors,
    };
  }

  return {
    ok: true,
    roadmap,
  };
}

export function normaliseGeneratedRoadmap(value: unknown, options: ValidationOptions = {}) {
  const result = validateGeneratedRoadmap(value, options);
  return result.ok ? result.roadmap : null;
}

export const generatedRoadmapJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "routeId",
    "generatedAt",
    "headline",
    "profileSummary",
    "confidenceNote",
    "sections",
    "watchOuts",
    "backupOptions",
    "sourceWarnings",
    "followUpPrompts",
  ],
  properties: {
    routeId: {
      type: "string",
      minLength: 1,
      maxLength: 120,
    },
    generatedAt: {
      type: "string",
      minLength: 1,
      maxLength: 80,
    },
    headline: {
      type: "string",
      minLength: 1,
      maxLength: 120,
    },
    profileSummary: {
      type: "string",
      minLength: 1,
      maxLength: 360,
    },
    confidenceNote: {
      type: "string",
      minLength: 1,
      maxLength: 360,
    },
    sections: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "summary", "tasks"],
        properties: {
          id: {
            type: "string",
            enum: generatedRoadmapSectionDefinitions.map((section) => section.id),
          },
          title: {
            type: "string",
            enum: generatedRoadmapSectionDefinitions.map((section) => section.title),
          },
          summary: {
            type: "string",
            minLength: 1,
            maxLength: 240,
          },
          tasks: {
            type: "array",
            minItems: 2,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "title",
                "detail",
                "timeframe",
                "whyItMatters",
                "evidenceToGather",
                "checks",
                "trustLabels",
              ],
              properties: {
                title: {
                  type: "string",
                  minLength: 1,
                  maxLength: 80,
                },
                detail: {
                  type: "string",
                  minLength: 1,
                  maxLength: 420,
                },
                timeframe: {
                  type: "string",
                  minLength: 1,
                  maxLength: 80,
                },
                whyItMatters: {
                  type: "string",
                  minLength: 1,
                  maxLength: 280,
                },
                evidenceToGather: {
                  type: "string",
                  minLength: 1,
                  maxLength: 240,
                },
                checks: {
                  type: "array",
                  minItems: 0,
                  maxItems: 2,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["label", "detail", "trustLabel"],
                    properties: {
                      label: {
                        type: "string",
                        minLength: 1,
                        maxLength: 60,
                      },
                      detail: {
                        type: "string",
                        minLength: 1,
                        maxLength: 240,
                      },
                      trustLabel: {
                        type: "string",
                        enum: roadmapTrustLabels,
                      },
                    },
                  },
                },
                trustLabels: {
                  type: "array",
                  minItems: 1,
                  maxItems: 3,
                  items: {
                    type: "string",
                    enum: roadmapTrustLabels,
                  },
                },
              },
            },
          },
        },
      },
    },
    watchOuts: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 260,
      },
    },
    backupOptions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "string",
        minLength: 1,
        maxLength: 120,
      },
    },
    sourceWarnings: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "detail", "trustLabel"],
        properties: {
          label: {
            type: "string",
            minLength: 1,
            maxLength: 80,
          },
          detail: {
            type: "string",
            minLength: 1,
            maxLength: 280,
          },
          trustLabel: {
            type: "string",
            enum: sourceWarningTrustLabels,
          },
        },
      },
    },
    followUpPrompts: {
      type: "array",
      minItems: 0,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "question", "whyItHelps"],
        properties: {
          id: {
            type: "string",
            enum: followUpPromptIds,
          },
          label: {
            type: "string",
            minLength: 1,
            maxLength: 80,
          },
          question: {
            type: "string",
            minLength: 1,
            maxLength: 180,
          },
          whyItHelps: {
            type: "string",
            minLength: 1,
            maxLength: 220,
          },
        },
      },
    },
  },
} as const;
