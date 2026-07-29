"use client";

import { useEffect, useState } from "react";

import { mockRoutes } from "@/data/routes/mock-routes";
import type { CatalogSourceStatus, RouteOption } from "@/types";

type CatalogueRoutesResponse = {
  generatedAt: string;
  usedFallback: boolean;
  routes: RouteOption[];
  freshness: CatalogSourceStatus[];
};

const demoFreshness: CatalogSourceStatus[] = [
  {
    source: "discoverUni",
    label: "Discover Uni",
    freshnessStatus: "demo",
    recordsSeen: 0,
    recordsChanged: 0,
    staleAfterMinutes: 60 * 24 * 8,
  },
  {
    source: "ucas",
    label: "UCAS",
    freshnessStatus: "demo",
    recordsSeen: 0,
    recordsChanged: 0,
    staleAfterMinutes: 60 * 24,
  },
  {
    source: "findApprenticeshipEngland",
    label: "Find an apprenticeship England",
    freshnessStatus: "demo",
    recordsSeen: 0,
    recordsChanged: 0,
    staleAfterMinutes: 90,
  },
];

function fallbackResponse(): CatalogueRoutesResponse {
  return {
    generatedAt: new Date().toISOString(),
    usedFallback: true,
    freshness: demoFreshness,
    routes: mockRoutes.map((route) => ({
      ...route,
      sourceKind: "demo",
      opportunityCount: 0,
      freshnessStatus: "demo",
      sourceRecordIds: [],
      opportunities: [],
    })),
  };
}

export function useCatalogueRoutes() {
  const [catalogue, setCatalogue] = useState<CatalogueRoutesResponse>(fallbackResponse);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/catalogue/routes")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Catalogue routes request failed.");
        }

        return response.json() as Promise<CatalogueRoutesResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setCatalogue(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogue(fallbackResponse());
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...catalogue,
    isLoading,
  };
}

export function useCatalogueRoute(routeId: string | undefined) {
  const catalogue = useCatalogueRoutes();
  const route = routeId ? catalogue.routes.find((item) => item.id === routeId) ?? null : null;

  return {
    ...catalogue,
    route,
  };
}
