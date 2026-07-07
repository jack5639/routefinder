import type {
  DebtPreference,
  GradeBand,
  QuizAnswers,
  RouteOption,
  ScoredRoute,
  SimulatorChange,
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

function normalise(value: string) {
  return value.trim().toLowerCase();
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
  return routes
    .map((route) => scoreRoute(route, answers))
    .sort((left, right) => right.totalScore - left.totalScore)
    .slice(0, limit);
}

export function compareRouteScores(
  routes: RouteOption[],
  baselineAnswers: QuizAnswers,
  changedAnswers: QuizAnswers,
  visibleLimit = 5,
): SimulatorChange[] {
  const baseline = new Map(rankRoutes(routes, baselineAnswers, visibleLimit).map((route) => [route.id, route.totalScore]));
  const changed = new Map(rankRoutes(routes, changedAnswers, visibleLimit).map((route) => [route.id, route.totalScore]));
  const routeIds = new Set([...baseline.keys(), ...changed.keys()]);

  return Array.from(routeIds)
    .map((routeId) => {
      const before = baseline.get(routeId);
      const after = changed.get(routeId);
      const delta = Math.round((after ?? 0) - (before ?? 0));

      if (before === undefined && after !== undefined) {
        return { routeId, label: "appeared" as const, delta: after };
      }

      if (before !== undefined && after === undefined) {
        return { routeId, label: "disappeared" as const, delta: -before };
      }

      if (delta >= 4) {
        return { routeId, label: "improved" as const, delta };
      }

      if (delta <= -4) {
        return { routeId, label: "worsened" as const, delta };
      }

      return { routeId, label: "steady" as const, delta };
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
}
