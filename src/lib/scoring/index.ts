/**
 * Frozen V2 route-family scoring API.
 *
 * This stays available for the existing quiz, results, simulator, and tests.
 * Future V3 product code must not import it unless a deliberate migration
 * decision records why its route-scoring assumptions still apply.
 */
export {
  applySingleSimulatorChange,
  buildSimulatorComparison,
  buildDecisionBoard,
  classifyScoredRoute,
  compareRouteScores,
  countSimulatorChangedFactors,
  decisionBoardCategoryDefinitions,
  rankRoutes,
  scoreRoute,
} from "./scoring";
export {
  buildDecisionBoardWithFeedback,
  createEmptyRouteFeedbackState,
  getRouteFeedbackActionLabel,
  getRouteFeedbackCount,
  getRouteFeedbackEntry,
  isRouteFeedbackActionId,
  rankRoutesWithFeedback,
  routeFeedbackActions,
  scoreRoutesWithFeedback,
  toggleRouteFeedbackAction,
} from "./recommendation-feedback";
