import { sourceLabels, sourceStaleAfterMinutes } from "@/lib/catalog/config";
import type { CatalogDatabase } from "@/lib/catalog/database";
import type { CatalogSource, CatalogueFreshness, CatalogSourceStatus } from "@/types";

function sourceStatusFromSync(lastSuccessfulSync: string | undefined, latestStatus: string | undefined, source: CatalogSource): CatalogueFreshness {
  if (!lastSuccessfulSync) {
    return latestStatus === "failed" ? "error" : "missing";
  }

  const ageMs = Date.now() - new Date(lastSuccessfulSync).getTime();
  const staleAfterMs = sourceStaleAfterMinutes[source] * 60 * 1000;

  if (latestStatus === "failed") {
    return "error";
  }

  return ageMs > staleAfterMs ? "stale" : "fresh";
}

export function getCatalogueSourceStatus(db: CatalogDatabase): CatalogSourceStatus[] {
  const latestRun = db.prepare(
    `SELECT *
     FROM source_runs
     WHERE source = ?
     ORDER BY started_at DESC
     LIMIT 1`,
  );
  const latestSuccess = db.prepare(
    `SELECT *
     FROM source_runs
     WHERE source = ? AND status = 'success'
     ORDER BY started_at DESC
     LIMIT 1`,
  );

  return (Object.keys(sourceLabels) as CatalogSource[]).map((source) => {
    const latest = latestRun.get(source) as
      | {
          status: string;
          started_at: string;
          records_seen: number;
          records_changed: number;
          error_message?: string;
        }
      | undefined;
    const success = latestSuccess.get(source) as
      | {
          finished_at: string;
          records_seen: number;
          records_changed: number;
        }
      | undefined;

    return {
      source,
      label: sourceLabels[source],
      freshnessStatus: sourceStatusFromSync(success?.finished_at, latest?.status, source),
      lastSuccessfulSync: success?.finished_at,
      lastAttemptedSync: latest?.started_at,
      recordsSeen: success?.records_seen ?? 0,
      recordsChanged: success?.records_changed ?? 0,
      errorMessage: latest?.status === "failed" ? latest.error_message : undefined,
      staleAfterMinutes: sourceStaleAfterMinutes[source],
    };
  });
}

export function getCatalogueCounts(db: CatalogDatabase) {
  const sourceRecords = db.prepare("SELECT COUNT(*) AS count FROM source_records").get() as { count: number };
  const universityCourses = db.prepare("SELECT COUNT(*) AS count FROM university_courses").get() as { count: number };
  const openApprenticeships = db
    .prepare("SELECT COUNT(*) AS count FROM apprenticeship_vacancies WHERE status != 'closed'")
    .get() as { count: number };
  const routeFamilies = db.prepare("SELECT COUNT(*) AS count FROM route_families").get() as { count: number };

  return {
    sourceRecords: sourceRecords.count,
    universityCourses: universityCourses.count,
    openApprenticeships: openApprenticeships.count,
    routeFamilies: routeFamilies.count,
  };
}
