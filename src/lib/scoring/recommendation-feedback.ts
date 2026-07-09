import type {
  DecisionBoardGroup,
  QuizAnswers,
  RouteFeedbackActionId,
  RouteFeedbackEntry,
  RouteFeedbackState,
  RouteOption,
  RouteType,
  ScoredRoute,
} from "@/types";
import { classifyScoredRoute, decisionBoardCategoryDefinitions, scoreRoute } from "./scoring";

type RouteFeedbackActionGroup = "sentiment" | "route-concern" | "preference";

export type RouteFeedbackActionDefinition = {
  id: RouteFeedbackActionId;
  label: string;
  group: RouteFeedbackActionGroup;
};

export const routeFeedbackActions: RouteFeedbackActionDefinition[] = [
  { id: "like", label: "I like this", group: "sentiment" },
  { id: "maybe", label: "Maybe", group: "sentiment" },
  { id: "not-for-me", label: "Not for me", group: "sentiment" },
  { id: "too-academic", label: "Too academic", group: "route-concern" },
  { id: "too-expensive", label: "Too expensive", group: "route-concern" },
  { id: "too-far", label: "Too far", group: "route-concern" },
  { id: "too-competitive", label: "Too competitive", group: "route-concern" },
  { id: "more-practical-routes", label: "More practical routes", group: "preference" },
  { id: "higher-earning-routes", label: "Higher earning routes", group: "preference" },
  { id: "safer-backup-options", label: "Safer backup options", group: "preference" },
  { id: "lower-debt-routes", label: "Lower-debt routes", group: "preference" },
];

const routeFeedbackActionIdSet = new Set<RouteFeedbackActionId>(routeFeedbackActions.map((action) => action.id));
const routeFeedbackLabelById = new Map<RouteFeedbackActionId, string>(
  routeFeedbackActions.map((action) => [action.id, action.label]),
);
const routeFeedbackOrder = new Map<RouteFeedbackActionId, number>(
  routeFeedbackActions.map((action, index) => [action.id, index]),
);
const sentimentActionIds = new Set<RouteFeedbackActionId>(["like", "maybe", "not-for-me"]);

const academicRouteTypes: RouteType[] = ["University degree", "Foundation year", "Access course"];
const practicalRouteTypes: RouteType[] = [
  "Degree apprenticeship",
  "Higher apprenticeship",
  "College course",
  "Direct work/training",
  "Portfolio/project route",
];

type FeedbackProfile = {
  preferPractical: number;
  preferHigherEarning: number;
  preferSafer: number;
  preferLowerDebt: number;
  avoidAcademic: number;
  avoidExpensive: number;
  avoidFar: number;
  avoidCompetitive: number;
};

export function createEmptyRouteFeedbackState(): RouteFeedbackState {
  return { entries: {} };
}

export function isRouteFeedbackActionId(value: unknown): value is RouteFeedbackActionId {
  return typeof value === "string" && routeFeedbackActionIdSet.has(value as RouteFeedbackActionId);
}

export function getRouteFeedbackActionLabel(actionId: RouteFeedbackActionId) {
  return routeFeedbackLabelById.get(actionId) ?? actionId;
}

export function getRouteFeedbackEntry(state: RouteFeedbackState, routeId: string) {
  return state.entries[routeId] ?? null;
}

export function getRouteFeedbackCount(state: RouteFeedbackState) {
  return Object.values(state.entries).filter((entry) => entry.actionIds.length > 0).length;
}

function sortActionIds(actionIds: RouteFeedbackActionId[]) {
  return [...actionIds].sort((left, right) => (routeFeedbackOrder.get(left) ?? 0) - (routeFeedbackOrder.get(right) ?? 0));
}

export function toggleRouteFeedbackAction(
  state: RouteFeedbackState,
  routeId: string,
  actionId: RouteFeedbackActionId,
  updatedAt = new Date().toISOString(),
): RouteFeedbackState {
  const cleanRouteId = routeId.trim();

  if (!cleanRouteId) {
    return state;
  }

  const existingEntry = state.entries[cleanRouteId];
  const currentActionIds = existingEntry?.actionIds ?? [];
  const isActive = currentActionIds.includes(actionId);
  let nextActionIds = isActive
    ? currentActionIds.filter((currentActionId) => currentActionId !== actionId)
    : [...currentActionIds, actionId];

  if (!isActive && sentimentActionIds.has(actionId)) {
    nextActionIds = nextActionIds.filter(
      (currentActionId) => currentActionId === actionId || !sentimentActionIds.has(currentActionId),
    );
  }

  const entries = { ...state.entries };

  if (nextActionIds.length === 0) {
    delete entries[cleanRouteId];
    return { entries };
  }

  entries[cleanRouteId] = {
    routeId: cleanRouteId,
    actionIds: sortActionIds(Array.from(new Set(nextActionIds))),
    updatedAt,
  };

  return { entries };
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function clampDelta(delta: number) {
  return Math.max(-35, Math.min(25, Math.round(delta)));
}

function countAction(entries: RouteFeedbackEntry[], actionId: RouteFeedbackActionId) {
  return entries.filter((entry) => entry.actionIds.includes(actionId)).length;
}

function capSignal(value: number) {
  return Math.min(3, Math.max(0, value));
}

function buildFeedbackProfile(state: RouteFeedbackState): FeedbackProfile {
  const entries = Object.values(state.entries);

  return {
    preferPractical: capSignal(countAction(entries, "more-practical-routes") + countAction(entries, "too-academic")),
    preferHigherEarning: capSignal(countAction(entries, "higher-earning-routes")),
    preferSafer: capSignal(countAction(entries, "safer-backup-options") + countAction(entries, "too-competitive")),
    preferLowerDebt: capSignal(countAction(entries, "lower-debt-routes") + countAction(entries, "too-expensive")),
    avoidAcademic: capSignal(countAction(entries, "too-academic")),
    avoidExpensive: capSignal(countAction(entries, "too-expensive")),
    avoidFar: capSignal(countAction(entries, "too-far")),
    avoidCompetitive: capSignal(countAction(entries, "too-competitive")),
  };
}

function isAcademicRoute(route: RouteOption) {
  return route.workStyles.includes("academic") || academicRouteTypes.includes(route.type);
}

function isPracticalRoute(route: RouteOption) {
  return route.workStyles.includes("practical") || practicalRouteTypes.includes(route.type);
}

function isCompetitiveRoute(route: RouteOption) {
  return (
    route.type === "Degree apprenticeship" ||
    route.preferredGrades.includes("high") ||
    (route.type === "University degree" && route.preferredGrades.includes("strong"))
  );
}

function isLowerDebtRoute(route: RouteOption) {
  return route.debtLevel === "low";
}

function isReachableRoute(route: RouteOption, answers: QuizAnswers) {
  return route.maxTypicalTravelMinutes <= answers.maxTravelMinutes;
}

function isSaferBackupRoute(route: ScoredRoute, answers: QuizAnswers) {
  return (
    route.scores.feasibility >= 66 &&
    route.scores.constraint >= 64 &&
    (route.debtLevel === "low" || route.maxTypicalTravelMinutes <= answers.maxTravelMinutes)
  );
}

function applyRouteFeedback(route: ScoredRoute, answers: QuizAnswers, entry: RouteFeedbackEntry | null, profile: FeedbackProfile) {
  const activeActionIds = entry?.actionIds ?? [];
  const activeActions = new Set(activeActionIds);
  const reasons = new Set<string>();
  let delta = 0;

  function add(points: number, reason: string) {
    if (points === 0) {
      return;
    }

    delta += points;
    reasons.add(reason);
  }

  if (activeActions.has("like")) {
    add(12, "You marked this route as one to keep high in the comparison.");
  }

  if (activeActions.has("maybe")) {
    add(3, "You marked this as a maybe, so it stays visible without being treated as settled.");
  }

  if (activeActions.has("not-for-me")) {
    add(-28, "You marked this route as not for you, so it moves down on this device.");
  }

  if (activeActions.has("too-academic")) {
    add(isAcademicRoute(route) ? -13 : -5, "You flagged this route as too academic, so practical options get more space.");
  }

  if (activeActions.has("too-expensive")) {
    const costPenalty = route.debtLevel === "high" ? -16 : route.debtLevel === "medium" ? -9 : -4;
    add(costPenalty, "You flagged cost as a concern for this route.");
  }

  if (activeActions.has("too-far")) {
    add(isReachableRoute(route, answers) ? -6 : -14, "You flagged travel as a concern for this route.");
  }

  if (activeActions.has("too-competitive")) {
    add(isCompetitiveRoute(route) ? -14 : -7, "You flagged competitiveness as a concern for this route.");
  }

  if (profile.preferPractical > 0) {
    if (isPracticalRoute(route)) {
      add(profile.preferPractical * 5, "Your feedback is nudging practical routes upward.");
    } else if (profile.avoidAcademic > 0 && isAcademicRoute(route)) {
      add(profile.avoidAcademic * -5, "Your feedback is giving academic-heavy routes less weight for now.");
    }
  }

  if (profile.preferHigherEarning > 0) {
    if (route.earnSoonLevel >= 4) {
      add(profile.preferHigherEarning * 6, "Your feedback is giving earlier-earning routes more weight.");
    } else if (route.earnSoonLevel <= 2) {
      add(profile.preferHigherEarning * -4, "Your feedback is giving later-earning routes less weight for now.");
    }
  }

  if (profile.preferSafer > 0) {
    if (isSaferBackupRoute(route, answers)) {
      add(profile.preferSafer * 5, "Your feedback is lifting routes with stronger feasibility or constraint fit.");
    } else if (isCompetitiveRoute(route) || route.debtLevel === "high" || !isReachableRoute(route, answers)) {
      add(profile.preferSafer * -3, "Your feedback is lowering routes with more stretch factors for now.");
    }
  }

  if (profile.preferLowerDebt > 0) {
    if (isLowerDebtRoute(route)) {
      add(profile.preferLowerDebt * 6, "Your feedback is giving lower-debt routes more weight.");
    } else if (route.debtLevel === "high") {
      add(profile.preferLowerDebt * -6, "Your feedback is giving higher-debt routes less weight for now.");
    } else {
      add(profile.preferLowerDebt * -2, "Your feedback is making debt level matter more in the comparison.");
    }
  }

  if (profile.avoidFar > 0) {
    if (isReachableRoute(route, answers)) {
      add(profile.avoidFar * 3, "Your feedback is keeping more reachable routes in view.");
    } else {
      add(profile.avoidFar * -5, "Your feedback is lowering routes that may involve more travel.");
    }
  }

  if (profile.avoidCompetitive > 0) {
    if (route.constraintsSupported.includes("grade-constrained") || isSaferBackupRoute(route, answers)) {
      add(profile.avoidCompetitive * 3, "Your feedback is keeping backup routes visible.");
    } else if (isCompetitiveRoute(route)) {
      add(profile.avoidCompetitive * -4, "Your feedback is lowering more competitive routes for now.");
    }
  }

  const clampedDelta = clampDelta(delta);
  const adjustedTotalScore = clampScore(route.totalScore + clampedDelta);
  const effectiveDelta = adjustedTotalScore - route.totalScore;

  if (activeActionIds.length === 0 && effectiveDelta === 0) {
    return route;
  }

  return {
    ...route,
    totalScore: adjustedTotalScore,
    feedbackAdjustment: {
      delta: effectiveDelta,
      originalTotalScore: route.totalScore,
      activeActionLabels: activeActionIds.map(getRouteFeedbackActionLabel),
      reasons: Array.from(reasons).slice(0, 3),
    },
  };
}

export function scoreRoutesWithFeedback(
  routes: RouteOption[],
  answers: QuizAnswers,
  feedbackState: RouteFeedbackState,
): ScoredRoute[] {
  const profile = buildFeedbackProfile(feedbackState);

  return routes
    .map((route) => {
      const scored = scoreRoute(route, answers);
      return applyRouteFeedback(scored, answers, feedbackState.entries[route.id] ?? null, profile);
    })
    .sort((left, right) => {
      const scoreDelta = right.totalScore - left.totalScore;

      if (scoreDelta !== 0) {
        return scoreDelta;
      }

      const feedbackDelta = (right.feedbackAdjustment?.delta ?? 0) - (left.feedbackAdjustment?.delta ?? 0);

      if (feedbackDelta !== 0) {
        return feedbackDelta;
      }

      return right.scores.confidence - left.scores.confidence;
    });
}

export function rankRoutesWithFeedback(
  routes: RouteOption[],
  answers: QuizAnswers,
  feedbackState: RouteFeedbackState,
  limit = 5,
) {
  return scoreRoutesWithFeedback(routes, answers, feedbackState).slice(0, limit);
}

export function buildDecisionBoardWithFeedback(
  routes: RouteOption[],
  answers: QuizAnswers,
  feedbackState: RouteFeedbackState,
): DecisionBoardGroup[] {
  const scoredRoutes = scoreRoutesWithFeedback(routes, answers, feedbackState);
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
