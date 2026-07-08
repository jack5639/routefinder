import { clearQuizAnswers, loadQuizAnswers, saveQuizAnswers } from "@/lib/quiz-storage";
import {
  clearSavedRoadmap,
  loadSavedRoadmap,
  loadSavedRouteId,
  saveSavedRoadmap,
} from "@/lib/saved-roadmap-storage";

export {
  clearQuizAnswers,
  clearSavedRoadmap,
  loadQuizAnswers,
  loadSavedRoadmap,
  loadSavedRouteId,
  saveQuizAnswers,
  saveSavedRoadmap,
};

export function clearRoutefinderLocalState() {
  clearQuizAnswers();
  clearSavedRoadmap();
}
