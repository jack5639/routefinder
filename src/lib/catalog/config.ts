import { resolve } from "node:path";

import type { CatalogSource } from "@/types";

export const DEFAULT_CATALOG_DB_PATH = "data/catalog/catalog.sqlite";
export const DEFAULT_APPRENTICESHIP_SYNC_MINUTES = 30;
export const DEFAULT_UNIVERSITY_SYNC_HOUR = 2;

export const sourceLabels: Record<CatalogSource, string> = {
  discoverUni: "Discover Uni",
  ucas: "UCAS",
  findApprenticeshipEngland: "Find an apprenticeship England",
};

export const sourceStaleAfterMinutes: Record<CatalogSource, number> = {
  discoverUni: 60 * 24 * 8,
  ucas: 60 * 24,
  findApprenticeshipEngland: 90,
};

export function getCatalogDbPath() {
  return resolve(/* turbopackIgnore: true */ process.cwd(), process.env.CATALOG_DB_PATH ?? DEFAULT_CATALOG_DB_PATH);
}

export function getApprenticeshipSyncMinutes() {
  const value = Number(process.env.CATALOG_APPRENTICESHIP_SYNC_MINUTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_APPRENTICESHIP_SYNC_MINUTES;
}

export function getUniversitySyncHour() {
  const value = Number(process.env.CATALOG_UNIVERSITY_SYNC_HOUR);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : DEFAULT_UNIVERSITY_SYNC_HOUR;
}
