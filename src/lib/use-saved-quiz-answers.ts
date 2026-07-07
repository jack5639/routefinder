"use client";

import { useSyncExternalStore } from "react";
import {
  normaliseQuizAnswers,
  QUIZ_ANSWERS_CHANGED_EVENT,
  QUIZ_ANSWERS_STORAGE_KEY,
} from "@/lib/quiz-storage";
import type { QuizAnswers } from "@/types";

let lastStoredValue: string | null | undefined;
let lastSnapshot: QuizAnswers | null = null;

function readSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(QUIZ_ANSWERS_STORAGE_KEY);

  if (stored === lastStoredValue) {
    return lastSnapshot;
  }

  lastStoredValue = stored;

  if (!stored) {
    lastSnapshot = null;
    return lastSnapshot;
  }

  try {
    lastSnapshot = normaliseQuizAnswers(JSON.parse(stored));
  } catch {
    lastSnapshot = null;
  }

  return lastSnapshot;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(QUIZ_ANSWERS_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(QUIZ_ANSWERS_CHANGED_EVENT, onStoreChange);
  };
}

function getServerSnapshot() {
  return null;
}

export function useSavedQuizAnswers() {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}
