import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearRouteFeedbackState,
  loadRouteFeedbackState,
  normaliseRouteFeedbackState,
  ROUTE_FEEDBACK_STORAGE_KEY,
  toggleStoredRouteFeedbackAction,
} from "@/lib/route-feedback-storage";

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

describe("route feedback storage", () => {
  it("normalises valid feedback and drops invalid actions", () => {
    expect(
      normaliseRouteFeedbackState({
        entries: {
          "computer-science-degree": {
            routeId: " computer-science-degree ",
            actionIds: ["like", "not-a-real-action", "lower-debt-routes"],
            updatedAt: "2026-07-09T10:00:00.000Z",
          },
        },
      }),
    ).toEqual({
      entries: {
        "computer-science-degree": {
          routeId: "computer-science-degree",
          actionIds: ["like", "lower-debt-routes"],
          updatedAt: "2026-07-09T10:00:00.000Z",
        },
      },
    });
  });

  it("handles missing browser storage and invalid JSON safely", () => {
    expect(loadRouteFeedbackState()).toEqual({ entries: {} });
    expect(() => clearRouteFeedbackState()).not.toThrow();

    stubWindowStorage({
      [ROUTE_FEEDBACK_STORAGE_KEY]: "{not-json",
    });

    expect(loadRouteFeedbackState()).toEqual({ entries: {} });
  });

  it("stores feedback and keeps sentiment actions mutually exclusive", () => {
    stubWindowStorage({});

    toggleStoredRouteFeedbackAction("software-degree-apprenticeship", "like");
    const maybeState = toggleStoredRouteFeedbackAction("software-degree-apprenticeship", "maybe");

    expect(maybeState.entries["software-degree-apprenticeship"].actionIds).toEqual(["maybe"]);
    expect(window.localStorage.setItem).toHaveBeenCalled();
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});
