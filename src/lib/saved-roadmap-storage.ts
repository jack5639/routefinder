import type { SavedRoadmap } from "@/types";

export const SAVED_ROADMAP_STORAGE_KEY = "routefinder.savedRoadmap.v1";
export const SAVED_ROADMAP_CHANGED_EVENT = "routefinder:saved-roadmap-changed";

export function normaliseSavedRoadmap(value: unknown): SavedRoadmap | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.routeId !== "string" ||
    !candidate.routeId.trim() ||
    typeof candidate.savedAt !== "string" ||
    Number.isNaN(Date.parse(candidate.savedAt))
  ) {
    return null;
  }

  return {
    routeId: candidate.routeId.trim(),
    savedAt: candidate.savedAt,
  };
}

export function loadSavedRoadmap(): SavedRoadmap | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(SAVED_ROADMAP_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  try {
    return normaliseSavedRoadmap(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveSavedRoadmap(routeId: string) {
  const savedRoadmap: SavedRoadmap = {
    routeId,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(SAVED_ROADMAP_STORAGE_KEY, JSON.stringify(savedRoadmap));
  window.dispatchEvent(new Event(SAVED_ROADMAP_CHANGED_EVENT));

  return savedRoadmap;
}

export function clearSavedRoadmap() {
  window.localStorage.removeItem(SAVED_ROADMAP_STORAGE_KEY);
  window.dispatchEvent(new Event(SAVED_ROADMAP_CHANGED_EVENT));
}
