import { clearQuizAnswers, loadQuizAnswers, saveQuizAnswers } from "@/lib/quiz-storage";
<<<<<<< HEAD
import { clearRouteFeedbackState } from "@/lib/route-feedback-storage";
=======
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
import {
  clearSavedRoadmap,
  loadSavedRoadmap,
  loadSavedRouteId,
  saveSavedRoadmap,
} from "@/lib/saved-roadmap-storage";

export {
  clearQuizAnswers,
<<<<<<< HEAD
  clearRouteFeedbackState,
=======
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
  clearSavedRoadmap,
  loadQuizAnswers,
  loadSavedRoadmap,
  loadSavedRouteId,
  saveQuizAnswers,
  saveSavedRoadmap,
};

export function clearRoutefinderLocalState() {
  clearQuizAnswers();
<<<<<<< HEAD
  clearRouteFeedbackState();
=======
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
  clearSavedRoadmap();
}
