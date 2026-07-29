import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearSavedRoadmap,
  loadSavedRoadmap,
  loadSavedRouteId,
  normaliseSavedRoadmap,
  SAVED_ROADMAP_STORAGE_KEY,
  saveSavedRoadmap,
} from "@/lib/saved-roadmap-storage";

function stubWindowStorage(initialValues: Record<string, string>) {
  const store = new Map(Object.entries(initialValues));

  vi.stubGlobal("window", {
    localStorage: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      removeItem: vi.fn((key: string) => store.delete(key)),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    },
    dispatchEvent: vi.fn(),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normaliseSavedRoadmap", () => {
  it("accepts a saved roadmap with a route id and timestamp", () => {
    expect(
      normaliseSavedRoadmap({
        routeId: " computer-science-degree ",
        savedAt: "2026-07-07T10:00:00.000Z",
      }),
    ).toEqual({
      routeId: "computer-science-degree",
      savedAt: "2026-07-07T10:00:00.000Z",
    });
  });

  it("rejects invalid saved roadmap data", () => {
    expect(normaliseSavedRoadmap(null)).toBeNull();
    expect(normaliseSavedRoadmap({ routeId: "", savedAt: "2026-07-07T10:00:00.000Z" })).toBeNull();
    expect(normaliseSavedRoadmap({ routeId: "route", savedAt: "not-a-date" })).toBeNull();
  });

  it("handles missing browser storage safely", () => {
    expect(loadSavedRoadmap()).toBeNull();
    expect(loadSavedRouteId()).toBeNull();
    expect(saveSavedRoadmap("computer-science-degree")).toBeNull();
    expect(() => clearSavedRoadmap()).not.toThrow();
  });

  it("handles invalid stored roadmap data safely", () => {
    stubWindowStorage({
      [SAVED_ROADMAP_STORAGE_KEY]: "{not-json",
    });

    expect(loadSavedRoadmap()).toBeNull();
    expect(loadSavedRouteId()).toBeNull();
    expect(() => clearSavedRoadmap()).not.toThrow();
  });
});
