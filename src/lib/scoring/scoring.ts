import type {
  DecisionBoardCategoryDefinition,
  DecisionBoardCategoryId,
  DecisionBoardGroup,
  DebtPreference,
  GradeBand,
  QuizAnswers,
  RouteOption,
  ScoredRoute,
  SimulatorComparison,
  SimulatorChange,
  SimulatorFactor,
  SimulatorFactorPatch,
  SimulatorMovementLabel,
} from "@/types";

const gradeRank: Record<GradeBand, number> = {
  "needs-building": 1,
  steady: 2,
  strong: 3,
  high: 4,
};

const debtPenalty: Record<DebtPreference, Record<RouteOption["debtLevel"], number>> = {
  open: {
    low: 8,
    medium: 7,
    high: 6,
  },
  "some-concern": {
    low: 9,
    medium: 7,
    high: 4,
  },
  avoid: {
    low: 10,
    medium: 5,
    high: 2,
  },
};

const movementPriority: Record<SimulatorMovementLabel, number> = {
  appeared: 5,
  disappeared: 5,
  improved: 4,
  worsened: 4,
  steady: 1,
};

const simulatorFactorFields: Record<SimulatorFactor, (keyof SimulatorFactorPatch)[]> = {
  grades: ["predictedGrades"],
  travel: ["maxTravelMinutes"],
  debt: ["debtPreference"],
  target: ["targetCareer", "targetCourse"],
  interests: ["interests"],
  "day-to-day": ["workStyles", "earnSoon"],
};

export const decisionBoardCategoryDefinitions: DecisionBoardCategoryDefinition[] = [
  {
    id: "strong-fit",
    title: "Strong fit",
    summary:
      "Routes with the strongest current match across fit, feasibility, constraints, and confidence. Treat this as a starting point, not certainty.",
  },
  {
    id: "realistic",
    title: "Realistic",
    summary: "Routes that look workable from the current answers, with normal checks still needed.",
  },
  {
    id: "stretch",
    title: "Stretch",
    summary: "Routes with promising interest fit where grades, travel, cost, or evidence may need extra planning.",
  },
  {
    id: "safer-backup",
    title: "Safer backup",
    summary: "Routes that may protect flexibility because feasibility and constraints look more manageable.",
  },
  {
    id: "worth-exploring",
    title: "Worth exploring",
    summary: "Routes that are not ruled out, but need more information or stronger evidence before comparing closely.",
  },
];

function normalise(value: string) {
  return value.trim().toLowerCase();
}

function includesLoose(values: string[], target: string) {
  const normalisedTarget = normalise(target);

  if (!normalisedTarget) {
    return false;
  }

  return values.some((value) => {
    const normalisedValue = normalise(value);
    return normalisedValue.includes(normalisedTarget) || normalisedTarget.includes(normalisedValue);
  });
}

function sameStringList(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left.map(normalise));
  return right.every((value) => leftSet.has(normalise(value)));
}

function overlapScore(userValues: string[], routeValues: string[], pointsPerMatch: number, max: number) {
  const routeSet = new Set(routeValues.map(normalise));
  const matches = userValues.map(normalise).filter((value) => routeSet.has(value)).length;

  return Math.min(max, matches * pointsPerMatch);
}

function targetScore(answers: QuizAnswers, route: RouteOption) {
  const targetCareer = normalise(answers.targetCareer ?? "");
  const targetCourse = normalise(answers.targetCourse ?? "");

  let score = 0;

  if (targetCareer && route.relatedCareers.some((career) => normalise(career).includes(targetCareer) || targetCareer.includes(normalise(career)))) {
    score += 18;
  }

  if (targetCourse && route.relatedCourses.some((course) => normalise(course).includes(targetCourse) || targetCourse.includes(normalise(course)))) {
    score += 18;
  }

  return Math.min(26, score);
}

function gradeScore(answerBand: GradeBand, preferredBands: GradeBand[]) {
  const answerRank = gradeRank[answerBand];
  const closestPreferredRank = Math.min(...preferredBands.map((band) => Math.abs(gradeRank[band] - answerRank)));
  const includesBand = preferredBands.includes(answerBand);

  if (includesBand) {
    return 32;
  }

  if (closestPreferredRank === 1) {
    return 24;
  }

  if (answerRank > Math.max(...preferredBands.map((band) => gradeRank[band]))) {
    return 28;
  }

  return 14;
}

function travelScore(answers: QuizAnswers, route: RouteOption) {
  if (answers.maxTravelMinutes >= route.maxTypicalTravelMinutes) {
    return 22;
  }

  const gap = route.maxTypicalTravelMinutes - answers.maxTravelMinutes;

  if (gap <= 15) {
    return 16;
  }

  if (gap <= 35) {
    return 9;
  }

  return 3;
}

function earnSoonScore(answers: QuizAnswers, route: RouteOption) {
  const gap = Math.abs(answers.earnSoon - route.earnSoonLevel);
  return Math.max(0, 18 - gap * 4);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function rankAllRoutes(routes: RouteOption[], answers: QuizAnswers) {
  return routes
    .map((route) => scoreRoute(route, answers))
    .sort((left, right) => right.totalScore - left.totalScore);
}

function cloneAnswerValue(value: unknown) {
  return Array.isArray(value) ? [...value] : value;
}

function factorChanged(baselineAnswers: QuizAnswers, changedAnswers: QuizAnswers, factor: SimulatorFactor) {
  return simulatorFactorFields[factor].some((field) => {
    const baselineValue = baselineAnswers[field];
    const changedValue = changedAnswers[field];

    if (Array.isArray(baselineValue) && Array.isArray(changedValue)) {
      return !sameStringList(baselineValue, changedValue);
    }

    return (baselineValue ?? "") !== (changedValue ?? "");
  });
}

export function applySingleSimulatorChange(
  baselineAnswers: QuizAnswers,
  factor: SimulatorFactor,
  patch: SimulatorFactorPatch,
): QuizAnswers {
  const changedAnswers: QuizAnswers = {
    ...baselineAnswers,
    subjects: [...baselineAnswers.subjects],
    interests: [...baselineAnswers.interests],
    workStyles: [...baselineAnswers.workStyles],
    constraints: [...baselineAnswers.constraints],
  };

  simulatorFactorFields[factor].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(patch, field)) {
      (changedAnswers as Record<keyof SimulatorFactorPatch, unknown>)[field] = cloneAnswerValue(patch[field]);
    }
  });

  return changedAnswers;
}

export function countSimulatorChangedFactors(baselineAnswers: QuizAnswers, changedAnswers: QuizAnswers) {
  return (Object.keys(simulatorFactorFields) as SimulatorFactor[]).filter((factor) =>
    factorChanged(baselineAnswers, changedAnswers, factor),
  ).length;
}

function explainSimulatorChange({
  route,
  baselineAnswers,
  changedAnswers,
  label,
  baselineScore,
  changedScore,
}: {
  route: RouteOption;
  baselineAnswers: QuizAnswers;
  changedAnswers: QuizAnswers;
  label: SimulatorMovementLabel;
  baselineScore: number | null;
  changedScore: number | null;
}) {
  const explanations: string[] = [];

  if (label === "appeared") {
    explanations.push("It moved into the changed top routes, which means it is worth comparing, not a guaranteed outcome.");
  }

  if (label === "disappeared") {
    explanations.push("It moved out of the changed top routes, but it may still be possible with planning and local checks.");
  }

  if (baselineAnswers.predictedGrades !== changedAnswers.predictedGrades) {
    const baselineMatchesGrades = route.preferredGrades.includes(baselineAnswers.predictedGrades);
    const changedMatchesGrades = route.preferredGrades.includes(changedAnswers.predictedGrades);
    const gradesMovedUp = gradeRank[changedAnswers.predictedGrades] > gradeRank[baselineAnswers.predictedGrades];

    if (!baselineMatchesGrades && changedMatchesGrades) {
      explanations.push("The changed grade band is closer to this route's usual grade profile, so feasibility can rise.");
    } else if (baselineMatchesGrades && !changedMatchesGrades) {
      explanations.push("The changed grade band is further from this route's usual grade profile, so feasibility can soften.");
    } else if (gradesMovedUp) {
      explanations.push("A higher grade band can help routes with more competitive entry checks.");
    } else {
      explanations.push("A lower grade band can make grade-sensitive routes look more stretch-like.");
    }
  }

  if (baselineAnswers.maxTravelMinutes !== changedAnswers.maxTravelMinutes) {
    const baselineCanTravel = baselineAnswers.maxTravelMinutes >= route.maxTypicalTravelMinutes;
    const changedCanTravel = changedAnswers.maxTravelMinutes >= route.maxTypicalTravelMinutes;

    if (!baselineCanTravel && changedCanTravel) {
      explanations.push("The new travel limit now covers the typical search area for this route.");
    } else if (baselineCanTravel && !changedCanTravel) {
      explanations.push("The new travel limit may no longer cover the typical search area for this route.");
    } else if (changedAnswers.maxTravelMinutes > baselineAnswers.maxTravelMinutes) {
      explanations.push("A wider travel limit can keep routes with fewer nearby options in view.");
    } else {
      explanations.push("A tighter travel limit gives more weight to routes that are usually easier to find locally.");
    }
  }

  if (baselineAnswers.debtPreference !== changedAnswers.debtPreference) {
    if (changedAnswers.debtPreference === "avoid" && route.debtLevel === "high") {
      explanations.push("Preferring to avoid debt reduces the constraint score for higher-cost study routes.");
    } else if (baselineAnswers.debtPreference === "avoid" && changedAnswers.debtPreference === "open" && route.debtLevel === "high") {
      explanations.push("Being more open to debt can lift higher-cost study routes, though costs still need checking.");
    } else if (changedAnswers.debtPreference === "avoid" && route.debtLevel === "low") {
      explanations.push("Lower-debt routes get extra weight when avoiding debt matters more.");
    } else {
      explanations.push("Changing debt preference adjusts how strongly cost-related constraints affect this route.");
    }
  }

  if (!sameStringList(baselineAnswers.interests, changedAnswers.interests)) {
    const baselineInterestFit = overlapScore(baselineAnswers.interests, route.relatedInterests, 1, 10);
    const changedInterestFit = overlapScore(changedAnswers.interests, route.relatedInterests, 1, 10);

    if (changedInterestFit > baselineInterestFit) {
      explanations.push("The changed interests connect more closely with this route's demo interest tags.");
    } else if (changedInterestFit < baselineInterestFit) {
      explanations.push("The saved interests connect more closely with this route's demo interest tags.");
    } else {
      explanations.push("Changing interests shifts which routes get extra fit weight.");
    }
  }

  if (!sameStringList(baselineAnswers.workStyles, changedAnswers.workStyles)) {
    const baselineStyleFit = overlapScore(baselineAnswers.workStyles, route.workStyles, 1, 10);
    const changedStyleFit = overlapScore(changedAnswers.workStyles, route.workStyles, 1, 10);

    if (changedStyleFit > baselineStyleFit) {
      explanations.push("The changed day-to-day preference is closer to this route's working style.");
    } else if (changedStyleFit < baselineStyleFit) {
      explanations.push("The saved day-to-day preference is closer to this route's working style.");
    } else {
      explanations.push("Changing day-to-day preference adjusts the working-style part of the fit score.");
    }
  }

  if ((baselineAnswers.targetCareer ?? "") !== (changedAnswers.targetCareer ?? "")) {
    const baselineMatchedCareer = includesLoose(route.relatedCareers, baselineAnswers.targetCareer ?? "");
    const changedMatchedCareer = includesLoose(route.relatedCareers, changedAnswers.targetCareer ?? "");

    if (!baselineMatchedCareer && changedMatchedCareer) {
      explanations.push("The changed target career links more closely with this route, so fit can improve.");
    } else if (baselineMatchedCareer && !changedMatchedCareer) {
      explanations.push("The previous career target matched this route more closely than the changed target.");
    } else if (changedAnswers.targetCareer?.trim()) {
      explanations.push("The new career target changes which route links get extra fit weight.");
    }
  }

  if ((baselineAnswers.targetCourse ?? "") !== (changedAnswers.targetCourse ?? "")) {
    const baselineMatchedCourse = includesLoose(route.relatedCourses, baselineAnswers.targetCourse ?? "");
    const changedMatchedCourse = includesLoose(route.relatedCourses, changedAnswers.targetCourse ?? "");

    if (!baselineMatchedCourse && changedMatchedCourse) {
      explanations.push("The changed target course links more closely with this route, so fit can improve.");
    } else if (baselineMatchedCourse && !changedMatchedCourse) {
      explanations.push("The previous course target matched this route more closely than the changed target.");
    } else if (changedAnswers.targetCourse?.trim()) {
      explanations.push("The new course target changes which route links get extra fit weight.");
    }
  }

  if (baselineAnswers.earnSoon !== changedAnswers.earnSoon) {
    const baselineGap = Math.abs(baselineAnswers.earnSoon - route.earnSoonLevel);
    const changedGap = Math.abs(changedAnswers.earnSoon - route.earnSoonLevel);

    if (changedGap < baselineGap) {
      explanations.push("The changed earning-soon preference is closer to this route's earning profile.");
    } else if (changedGap > baselineGap) {
      explanations.push("The changed earning-soon preference is less close to this route's earning profile.");
    } else {
      explanations.push("Earning-soon preference changed, but this route stayed similarly aligned.");
    }
  }

  if (explanations.length === 0) {
    if (baselineScore !== null && changedScore !== null && Math.abs(changedScore - baselineScore) < 4) {
      explanations.push("The score stayed close because the changed answers do not strongly alter this route's fit, feasibility, or constraints.");
    } else {
      explanations.push("Several small scoring factors changed together, so use this as a planning prompt rather than a prediction.");
    }
  }

  return explanations.slice(0, 3);
}

export function scoreRoute(route: RouteOption, answers: QuizAnswers): ScoredRoute {
  const interestFit = overlapScore(answers.interests, route.relatedInterests, 9, 27);
  const styleFit = overlapScore(answers.workStyles, route.workStyles, 8, 24);
  const targetFit = targetScore(answers, route);
  const fit = clampScore(23 + interestFit + styleFit + targetFit);

  const feasibility = clampScore(
    gradeScore(answers.predictedGrades, route.preferredGrades) +
      travelScore(answers, route) +
      overlapScore(answers.subjects, [...route.relatedCourses, ...route.relatedInterests], 5, 18) +
      20,
  );

  const constraint = clampScore(
    debtPenalty[answers.debtPreference][route.debtLevel] * 5 +
      earnSoonScore(answers, route) +
      overlapScore(answers.constraints, route.constraintsSupported, 8, 24) +
      (answers.maxTravelMinutes >= route.maxTypicalTravelMinutes ? 8 : 0),
  );

  const missingInfo = [
    answers.targetCareer ? "" : "A target career would make this comparison more specific.",
    answers.targetCourse ? "" : "A target course would help compare course-led routes.",
    answers.subjects.length ? "" : "Subjects or current course details would improve feasibility scoring.",
  ].filter(Boolean);

  const confidence = clampScore(88 - missingInfo.length * 9 - (fit < 48 ? 7 : 0) - (feasibility < 48 ? 7 : 0));
  const totalScore = clampScore(fit * 0.42 + feasibility * 0.32 + constraint * 0.26);

  const watchOuts = [...route.risks];

  if (answers.maxTravelMinutes < route.maxTypicalTravelMinutes) {
    watchOuts.push("Travel may need checking because this route often involves a wider search area.");
  }

  if (answers.debtPreference === "avoid" && route.debtLevel === "high") {
    watchOuts.push("Costs and student finance may need extra planning because you prefer to avoid debt.");
  }

  return {
    ...route,
    scores: {
      fit,
      feasibility,
      constraint,
      confidence,
    },
    totalScore,
    explanation: {
      whyThisRouteFits: route.why,
      watchOuts,
      nextSteps: route.nextSteps,
      backupOptions: route.backupOptions,
      missingInfo,
    },
  };
}

export function rankRoutes(routes: RouteOption[], answers: QuizAnswers, limit = 5) {
  return rankAllRoutes(routes, answers).slice(0, limit);
}

export function classifyScoredRoute(route: ScoredRoute, rankIndex = 0): DecisionBoardCategoryId {
  const { fit, feasibility, constraint, confidence } = route.scores;
  const balancedCoreScore = Math.min(feasibility, constraint, confidence);

  if (
    (rankIndex === 0 && route.totalScore >= 66 && fit >= 58 && balancedCoreScore >= 55) ||
    (route.totalScore >= 74 && fit >= 68 && balancedCoreScore >= 58)
  ) {
    return "strong-fit";
  }

  if (fit >= 66 && (feasibility < 58 || constraint < 55)) {
    return "stretch";
  }

  if (feasibility >= 68 && constraint >= 68 && route.totalScore >= 56 && fit < 72) {
    return "safer-backup";
  }

  if (feasibility >= 70 && constraint >= 68 && route.totalScore >= 52 && fit < 58) {
    return "safer-backup";
  }

  if (route.totalScore >= 60 && confidence >= 60) {
    return "realistic";
  }

  return "worth-exploring";
}

export function buildDecisionBoard(routes: RouteOption[], answers: QuizAnswers): DecisionBoardGroup[] {
  const scoredRoutes = routes
    .map((route) => scoreRoute(route, answers))
    .sort((left, right) => right.totalScore - left.totalScore);

  const groups: DecisionBoardGroup[] = decisionBoardCategoryDefinitions.map((definition) => ({
    ...definition,
    routes: [],
  }));

  scoredRoutes.forEach((route, index) => {
    const categoryId = classifyScoredRoute(route, index);
    const group = groups.find((item) => item.id === categoryId);
    group?.routes.push(route);
  });

  const strongFitGroup = groups.find((group) => group.id === "strong-fit");

  if (scoredRoutes.length && strongFitGroup && strongFitGroup.routes.length === 0) {
    const strongestCurrentFit = scoredRoutes[0];
    const originalGroup = groups.find((group) => group.routes.some((route) => route.id === strongestCurrentFit.id));

    if (originalGroup) {
      originalGroup.routes = originalGroup.routes.filter((route) => route.id !== strongestCurrentFit.id);
    }

    strongFitGroup.routes.push(strongestCurrentFit);
  }

  return groups;
}

export function compareRouteScores(
  routes: RouteOption[],
  baselineAnswers: QuizAnswers,
  changedAnswers: QuizAnswers,
  visibleLimit = 5,
): SimulatorChange[] {
  const baselineRankedRoutes = rankAllRoutes(routes, baselineAnswers);
  const changedRankedRoutes = rankAllRoutes(routes, changedAnswers);
  const baselineVisible = new Set(baselineRankedRoutes.slice(0, visibleLimit).map((route) => route.id));
  const changedVisible = new Set(changedRankedRoutes.slice(0, visibleLimit).map((route) => route.id));
  const baselineById = new Map(baselineRankedRoutes.map((route, index) => [route.id, { route, rank: index + 1 }]));
  const changedById = new Map(changedRankedRoutes.map((route, index) => [route.id, { route, rank: index + 1 }]));
  const sourceRouteById = new Map(routes.map((route) => [route.id, route]));
  const routeIds = new Set([...baselineVisible, ...changedVisible]);

  return Array.from(routeIds)
    .map((routeId) => {
      const baseline = baselineById.get(routeId);
      const changed = changedById.get(routeId);
      const before = baseline?.route.totalScore ?? null;
      const after = changed?.route.totalScore ?? null;
      const delta = Math.round((after ?? 0) - (before ?? 0));
      const route = sourceRouteById.get(routeId) ?? baseline?.route ?? changed?.route;
      let label: SimulatorMovementLabel = "steady";

      if (!baselineVisible.has(routeId) && changedVisible.has(routeId)) {
        label = "appeared";
      } else if (baselineVisible.has(routeId) && !changedVisible.has(routeId)) {
        label = "disappeared";
      } else if (delta >= 4) {
        label = "improved";
      } else if (delta <= -4) {
        label = "worsened";
      }

      return {
        routeId,
        label,
        delta,
        baselineScore: before,
        changedScore: after,
        baselineRank: baseline?.rank ?? null,
        changedRank: changed?.rank ?? null,
        explanations: route
          ? explainSimulatorChange({
              route,
              baselineAnswers,
              changedAnswers,
              label,
              baselineScore: before,
              changedScore: after,
            })
          : ["The route moved because the changed answers altered its overall comparison score."],
      };
    })
    .sort((left, right) => {
      const priorityDelta = movementPriority[right.label] - movementPriority[left.label];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return Math.abs(right.delta) - Math.abs(left.delta);
    });
}

export function buildSimulatorComparison(
  routes: RouteOption[],
  baselineAnswers: QuizAnswers,
  changedAnswers: QuizAnswers,
  visibleLimit = 5,
): SimulatorComparison {
  return {
    baselineRoutes: rankRoutes(routes, baselineAnswers, visibleLimit),
    changedRoutes: rankRoutes(routes, changedAnswers, visibleLimit),
    changes: compareRouteScores(routes, baselineAnswers, changedAnswers, visibleLimit),
  };
}
