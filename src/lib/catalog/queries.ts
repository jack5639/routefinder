import { existsSync } from "node:fs";

import { mockRoutes } from "@/data/routes/mock-routes";
import { getCatalogDbPath } from "@/lib/catalog/config";
import { openCatalogDatabase } from "@/lib/catalog/database";
import { getCatalogueSourceStatus } from "@/lib/catalog/status";
import { buildDecisionBoard, rankRoutes, scoreRoute } from "@/lib/scoring";
import type {
  CatalogueFreshness,
  CatalogSourceStatus,
  DecisionBoardGroup,
  QuizAnswers,
  RecommendationResponse,
  RouteOpportunity,
  RouteOption,
} from "@/types";

function demoStatus(): CatalogSourceStatus[] {
  return [
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
}

function decorateDemoRoutes(): RouteOption[] {
  return mockRoutes.map((route) => ({
    ...route,
    sourceKind: "demo",
    opportunityCount: 0,
    freshnessStatus: "demo",
    sourceRecordIds: [],
    opportunities: [],
  }));
}

function parseJsonArray<T>(value: string | null | undefined): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCatalogueSnapshot() {
  const dbPath = getCatalogDbPath();

  if (!existsSync(dbPath)) {
    return {
      usedFallback: true,
      routes: decorateDemoRoutes(),
      freshness: demoStatus(),
    };
  }

  const db = openCatalogDatabase({ readOnly: true, path: dbPath });

  try {
    const rows = db.prepare("SELECT * FROM route_families").all() as Array<{
      id: string;
      source_kind: RouteOption["sourceKind"];
      evidence_level: RouteOption["evidenceLevel"];
      opportunity_count: number;
      last_synced_at: string | null;
      freshness_status: CatalogueFreshness;
      source_record_ids_json: string;
      opportunities_json: string;
    }>;
    const familyById = new Map(rows.map((row) => [row.id, row]));
    const routes = mockRoutes.map((route) => {
      const family = familyById.get(route.id);

      if (!family) {
        return {
          ...route,
          sourceKind: "demo" as const,
          opportunityCount: 0,
          freshnessStatus: "missing" as const,
          sourceRecordIds: [],
          opportunities: [],
        };
      }

      return {
        ...route,
        sourceKind: family.source_kind,
        evidenceLevel: family.evidence_level,
        opportunityCount: family.opportunity_count,
        lastSyncedAt: family.last_synced_at ?? undefined,
        lastChecked: family.last_synced_at ?? route.lastChecked,
        freshnessStatus: family.freshness_status,
        sourceRecordIds: parseJsonArray<string>(family.source_record_ids_json),
        opportunities: parseJsonArray<RouteOpportunity>(family.opportunities_json),
      };
    });

    return {
      usedFallback: rows.length === 0,
      routes: rows.length ? routes : decorateDemoRoutes(),
      freshness: getCatalogueSourceStatus(db),
    };
  } catch {
    return {
      usedFallback: true,
      routes: decorateDemoRoutes(),
      freshness: demoStatus(),
    };
  } finally {
    db.close();
  }
}

export function getCatalogueRoutes() {
  return getCatalogueSnapshot().routes;
}

export function getCatalogueRoute(routeId: string) {
  return getCatalogueRoutes().find((route) => route.id === routeId) ?? null;
}

export function getCatalogueDecisionBoard(answers: QuizAnswers): DecisionBoardGroup[] {
  return buildDecisionBoard(getCatalogueRoutes(), answers);
}

export function buildRecommendationResponse(answers: QuizAnswers, limit = 5): RecommendationResponse {
  const snapshot = getCatalogueSnapshot();

  return {
    generatedAt: new Date().toISOString(),
    usedFallback: snapshot.usedFallback,
    freshness: snapshot.freshness,
    routes: rankRoutes(snapshot.routes, answers, limit),
  };
}

export function getCatalogueOpportunities(options: { routeId?: string; q?: string; kind?: RouteOpportunity["kind"]; limit?: number }) {
  const routes = getCatalogueRoutes();
  const query = options.q?.trim().toLowerCase() ?? "";
  const limit = options.limit ?? 20;
  const opportunities = routes
    .filter((route) => !options.routeId || route.id === options.routeId)
    .flatMap((route) =>
      (route.opportunities ?? []).map((opportunity) => ({
        ...opportunity,
        routeId: route.id,
        routeTitle: route.title,
      })),
    )
    .filter((opportunity) => !options.kind || opportunity.kind === options.kind)
    .filter((opportunity) => {
      if (!query) {
        return true;
      }

      return [opportunity.title, opportunity.providerName, opportunity.employerName, opportunity.location, opportunity.summary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  return opportunities.slice(0, limit);
}

export function getCatalogueStatusSnapshot() {
  const snapshot = getCatalogueSnapshot();
  return {
    generatedAt: new Date().toISOString(),
    usedFallback: snapshot.usedFallback,
    freshness: snapshot.freshness,
  };
}

export function scoreCatalogueRoute(routeId: string, answers: QuizAnswers) {
  const route = getCatalogueRoute(routeId);
  return route ? scoreRoute(route, answers) : null;
}
