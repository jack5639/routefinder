import type { ApprenticeshipVacancy, CatalogSource, UniversityCourse } from "@/types";

export type SourceRecordKind = "university-course" | "apprenticeship-vacancy" | "source-page" | "aggregate";

export interface SourcePageSnapshot {
  url: string;
  fetchedAt: string;
  html: string;
  label?: string;
}

export interface RawSourceRecord {
  id: string;
  source: CatalogSource;
  sourceId: string;
  kind: SourceRecordKind;
  title: string;
  sourceUrl?: string;
  raw: Record<string, unknown>;
  tags: string[];
}

export interface SourceFetchResult {
  source: CatalogSource;
  fetchedAt: string;
  pages: SourcePageSnapshot[];
  sourceRecords: RawSourceRecord[];
  universityCourses: UniversityCourse[];
  apprenticeshipVacancies: ApprenticeshipVacancy[];
}

export interface SourceAdapter {
  source: CatalogSource;
  fetch(): Promise<SourceFetchResult>;
}

export async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "FutureRoutePlanner/0.1 source-backed education catalogue",
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
