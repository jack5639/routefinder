import {
  createEmptyRouteFeedbackState,
  isRouteFeedbackActionId,
  toggleRouteFeedbackAction,
} from "@/lib/scoring";
import type { RouteFeedbackActionId, RouteFeedbackEntry, RouteFeedbackState } from "@/types";

export const ROUTE_FEEDBACK_STORAGE_KEY = "routefinder.routeFeedback.v1";
export const ROUTE_FEEDBACK_CHANGED_EVENT = "routefinder:route-feedback-changed";

function uniqueValidActionIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.filter(isRouteFeedbackActionId)));
}

export function normaliseRouteFeedbackState(value: unknown): RouteFeedbackState {
  if (!value || typeof value !== "object") {
    return createEmptyRouteFeedbackState();
  }

  const candidate = value as Record<string, unknown>;
  const rawEntries = candidate.entries;

  if (!rawEntries || typeof rawEntries !== "object" || Array.isArray(rawEntries)) {
    return createEmptyRouteFeedbackState();
  }

  const entries: Record<string, RouteFeedbackEntry> = {};

  for (const [routeId, rawEntry] of Object.entries(rawEntries as Record<string, unknown>)) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const cleanRouteId = typeof entry.routeId === "string" && entry.routeId.trim() ? entry.routeId.trim() : routeId.trim();
    const actionIds = uniqueValidActionIds(entry.actionIds);
    const updatedAt =
      typeof entry.updatedAt === "string" && !Number.isNaN(Date.parse(entry.updatedAt))
        ? entry.updatedAt
        : new Date(0).toISOString();

    if (!cleanRouteId || actionIds.length === 0) {
      continue;
    }

    entries[cleanRouteId] = {
      routeId: cleanRouteId,
      actionIds,
      updatedAt,
    };
  }

  return { entries };
}

export function loadRouteFeedbackState(): RouteFeedbackState {
  if (typeof window === "undefined") {
    return createEmptyRouteFeedbackState();
  }

  const stored = window.localStorage.getItem(ROUTE_FEEDBACK_STORAGE_KEY);

  if (!stored) {
    return createEmptyRouteFeedbackState();
  }

  try {
    return normaliseRouteFeedbackState(JSON.parse(stored));
  } catch {
    return createEmptyRouteFeedbackState();
  }
}

export function saveRouteFeedbackState(state: RouteFeedbackState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ROUTE_FEEDBACK_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(ROUTE_FEEDBACK_CHANGED_EVENT));
}

export function toggleStoredRouteFeedbackAction(routeId: string, actionId: RouteFeedbackActionId) {
  if (typeof window === "undefined") {
    return createEmptyRouteFeedbackState();
  }

  const nextState = toggleRouteFeedbackAction(loadRouteFeedbackState(), routeId, actionId);
  saveRouteFeedbackState(nextState);
  return nextState;
}

export function clearRouteFeedbackState() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ROUTE_FEEDBACK_STORAGE_KEY);
  window.dispatchEvent(new Event(ROUTE_FEEDBACK_CHANGED_EVENT));
}
