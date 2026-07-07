"use client";

import { useSyncExternalStore } from "react";
import {
  normaliseSavedRoadmap,
  SAVED_ROADMAP_CHANGED_EVENT,
  SAVED_ROADMAP_STORAGE_KEY,
} from "@/lib/saved-roadmap-storage";
import type { SavedRoadmap } from "@/types";

let lastStoredValue: string | null | undefined;
let lastSnapshot: SavedRoadmap | null = null;

function readSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SAVED_ROADMAP_STORAGE_KEY);

  if (stored === lastStoredValue) {
    return lastSnapshot;
  }

  lastStoredValue = stored;

  if (!stored) {
    lastSnapshot = null;
    return lastSnapshot;
  }

  try {
    lastSnapshot = normaliseSavedRoadmap(JSON.parse(stored));
  } catch {
    lastSnapshot = null;
  }

  return lastSnapshot;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SAVED_ROADMAP_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SAVED_ROADMAP_CHANGED_EVENT, onStoreChange);
  };
}

function getServerSnapshot() {
  return null;
}

export function useSavedRoadmap() {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}
