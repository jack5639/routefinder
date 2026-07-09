import { clearQuizAnswers, loadQuizAnswers, saveQuizAnswers } from "@/lib/quiz-storage";
import { clearRouteFeedbackState } from "@/lib/route-feedback-storage";
import {
  clearSavedRoadmap,
  loadSavedRoadmap,
  loadSavedRouteId,
  saveSavedRoadmap,
} from "@/lib/saved-roadmap-storage";

export {
  clearQuizAnswers,
  clearRouteFeedbackState,
  clearSavedRoadmap,
  loadQuizAnswers,
  loadSavedRoadmap,
  loadSavedRouteId,
  saveQuizAnswers,
  saveSavedRoadmap,
};

export function clearRoutefinderLocalState() {
  clearQuizAnswers();
  clearRouteFeedbackState();
  clearSavedRoadmap();
}
