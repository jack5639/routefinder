"use client";

import { useSyncExternalStore } from "react";
import { createEmptyRouteFeedbackState } from "@/lib/scoring";
import {
  normaliseRouteFeedbackState,
  ROUTE_FEEDBACK_CHANGED_EVENT,
  ROUTE_FEEDBACK_STORAGE_KEY,
} from "@/lib/route-feedback-storage";
import type { RouteFeedbackState } from "@/types";

const emptySnapshot = createEmptyRouteFeedbackState();
let lastStoredValue: string | null | undefined;
let lastSnapshot: RouteFeedbackState = emptySnapshot;

function readSnapshot() {
  if (typeof window === "undefined") {
    return emptySnapshot;
  }

  const stored = window.localStorage.getItem(ROUTE_FEEDBACK_STORAGE_KEY);

  if (stored === lastStoredValue) {
    return lastSnapshot;
  }

  lastStoredValue = stored;

  if (!stored) {
    lastSnapshot = createEmptyRouteFeedbackState();
    return lastSnapshot;
  }

  try {
    lastSnapshot = normaliseRouteFeedbackState(JSON.parse(stored));
  } catch {
    lastSnapshot = createEmptyRouteFeedbackState();
  }

  return lastSnapshot;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(ROUTE_FEEDBACK_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(ROUTE_FEEDBACK_CHANGED_EVENT, onStoreChange);
  };
}

function getServerSnapshot() {
  return emptySnapshot;
}

export function useRouteFeedback() {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}
