import { initCatalogDatabase, withCatalogDatabase } from "@/lib/catalog/database";
import {
  beginSourceRun,
  completeSourceRun,
  deriveRouteFamilies,
  importSourceResult,
  writeSourceSnapshot,
} from "@/lib/catalog/importer";
import { getApprenticeshipSyncMinutes, getCatalogDbPath, getUniversitySyncHour } from "@/lib/catalog/config";
import { sourceAdapters } from "@/lib/catalog/sources";
import { getCatalogueCounts, getCatalogueSourceStatus } from "@/lib/catalog/status";
import type { CatalogSource } from "@/types";

function selectedSources(values: string[]) {
  const selected = new Set(values.filter(Boolean) as CatalogSource[]);

  if (!selected.size) {
    return sourceAdapters;
  }

  return sourceAdapters.filter((adapter) => selected.has(adapter.source));
}

export function initCatalogue() {
  const db = initCatalogDatabase();
  db.close();
  return getCatalogDbPath();
}

export async function syncCatalogue(options: { sources?: string[] } = {}) {
  const db = initCatalogDatabase();
  const adapters = selectedSources(options.sources ?? []);
  const results: Array<{ source: CatalogSource; status: "success" | "failed"; recordsSeen: number; recordsChanged: number; error?: string }> = [];

  try {
    for (const adapter of adapters) {
      const runId = beginSourceRun(db, adapter.source);

      try {
        const fetched = await adapter.fetch();
        const snapshotPath = writeSourceSnapshot(fetched, runId);
        const imported = importSourceResult(db, fetched, snapshotPath);
        completeSourceRun(db, runId, {
          status: "success",
          recordsSeen: imported.recordsSeen,
          recordsChanged: imported.recordsChanged,
          snapshotPath,
        });
        results.push({
          source: adapter.source,
          status: "success",
          recordsSeen: imported.recordsSeen,
          recordsChanged: imported.recordsChanged,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        completeSourceRun(db, runId, {
          status: "failed",
          recordsSeen: 0,
          recordsChanged: 0,
          errorMessage: message,
        });
        results.push({
          source: adapter.source,
          status: "failed",
          recordsSeen: 0,
          recordsChanged: 0,
          error: message,
        });
      }
    }

    deriveRouteFamilies(db);
  } finally {
    db.close();
  }

  return results;
}

export function getCatalogueStatusReport() {
  return withCatalogDatabase((db) => ({
    dbPath: getCatalogDbPath(),
    counts: getCatalogueCounts(db),
    freshness: getCatalogueSourceStatus(db),
  }));
}

export async function runCatalogueAgent(options: { once?: boolean } = {}) {
  initCatalogue();

  const apprenticeshipIntervalMs = getApprenticeshipSyncMinutes() * 60 * 1000;
  let lastUniversitySyncDay = "";

  async function runScheduledSync() {
    const now = new Date();
    const sources: CatalogSource[] = ["findApprenticeshipEngland"];
    const today = now.toISOString().slice(0, 10);

    if (now.getHours() === getUniversitySyncHour() && lastUniversitySyncDay !== today) {
      sources.push("discoverUni", "ucas");
      lastUniversitySyncDay = today;
    }

    if (options.once) {
      sources.push("discoverUni", "ucas");
    }

    const uniqueSources = Array.from(new Set(sources));
    const results = await syncCatalogue({ sources: uniqueSources });
    const summary = results.map((result) => `${result.source}:${result.status}:${result.recordsSeen}`).join(", ");
    console.log(`[catalogue-agent] ${new Date().toISOString()} ${summary}`);
  }

  await runScheduledSync();

  if (options.once) {
    return;
  }

  setInterval(() => {
    void runScheduledSync().catch((error) => {
      console.error("[catalogue-agent] scheduled sync failed", error);
    });
  }, apprenticeshipIntervalMs);
}
