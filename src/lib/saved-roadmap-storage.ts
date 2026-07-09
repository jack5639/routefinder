import type { SavedRoadmap } from "@/types";
import { normaliseGeneratedRoadmap } from "@/lib/roadmaps/generated-roadmap";

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

  const savedRoadmap: SavedRoadmap = {
    routeId: candidate.routeId.trim(),
    savedAt: candidate.savedAt,
  };

  const generatedRoadmap = normaliseGeneratedRoadmap(candidate.generatedRoadmap, {
    routeId: savedRoadmap.routeId,
  });

  if (generatedRoadmap) {
    savedRoadmap.generatedRoadmap = generatedRoadmap;
  }

  return savedRoadmap;
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

export function loadSavedRouteId() {
  return loadSavedRoadmap()?.routeId ?? null;
}

<<<<<<< HEAD
export function saveSavedRoadmap(routeId: string, generatedRoadmap?: SavedRoadmap["generatedRoadmap"]) {
=======
export function saveSavedRoadmap(routeId: string) {
>>>>>>> 99fa54b10813d37fd4180e1178ad6a253b04bc42
  if (typeof window === "undefined") {
    return null;
  }

  const savedRoadmap: SavedRoadmap = {
    routeId,
    savedAt: new Date().toISOString(),
  };

  if (generatedRoadmap) {
    savedRoadmap.generatedRoadmap = generatedRoadmap;
  }

  window.localStorage.setItem(SAVED_ROADMAP_STORAGE_KEY, JSON.stringify(savedRoadmap));
  window.dispatchEvent(new Event(SAVED_ROADMAP_CHANGED_EVENT));

  return savedRoadmap;
}

export function clearSavedRoadmap() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SAVED_ROADMAP_STORAGE_KEY);
  window.dispatchEvent(new Event(SAVED_ROADMAP_CHANGED_EVENT));
}
