import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initCatalogDatabase, type CatalogDatabase } from "@/lib/catalog/database";
import { deriveRouteFamilies, getCatalogueCounts, getCatalogueSourceStatus, importSourceResult } from "@/lib/catalog/importer";
import type { SourceFetchResult } from "@/lib/catalog/sources/types";

function fixtureResult(fetchedAt: string, vacancyTitle = "Software developer apprenticeship"): SourceFetchResult {
  return {
    source: "findApprenticeshipEngland",
    fetchedAt,
    pages: [],
    sourceRecords: [
      {
        id: "source-record-vacancy-1",
        source: "findApprenticeshipEngland",
        sourceId: "vacancy-1",
        kind: "apprenticeship-vacancy",
        title: vacancyTitle,
        sourceUrl: "https://www.findapprenticeship.service.gov.uk/apprenticeship/1",
        raw: { title: vacancyTitle },
        tags: ["technology", "software"],
      },
    ],
    universityCourses: [],
    apprenticeshipVacancies: [
      {
        id: "apprenticeship-1",
        source: "findApprenticeshipEngland",
        sourceId: "vacancy-1",
        title: vacancyTitle,
        employerName: "Example Tech",
        apprenticeshipLevel: "Level 6 Degree apprenticeship",
        location: "London",
        wage: "Annual wage £21,000",
        closingDate: "31 August 2026",
        vacancyUrl: "https://www.findapprenticeship.service.gov.uk/apprenticeship/1",
        status: "open",
        tags: ["technology", "software"],
        lastSeenAt: fetchedAt,
      },
    ],
  };
}

describe("catalogue importer", () => {
  let db: CatalogDatabase;

  beforeEach(() => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "routefinder-catalogue-")), "catalog.sqlite");
    db = initCatalogDatabase(dbPath);
  });

  afterEach(() => {
    db.close();
  });

  it("upserts source records idempotently and derives route family opportunity counts", () => {
    const first = importSourceResult(db, fixtureResult("2026-07-09T10:00:00.000Z"));
    const second = importSourceResult(db, fixtureResult("2026-07-09T10:30:00.000Z"));

    deriveRouteFamilies(db);

    const counts = getCatalogueCounts(db);
    const softwareFamily = db
      .prepare("SELECT opportunity_count, evidence_level FROM route_families WHERE id = ?")
      .get("software-degree-apprenticeship") as { opportunity_count: number; evidence_level: string };

    expect(first.recordsChanged).toBe(1);
    expect(second.recordsChanged).toBe(0);
    expect(counts.sourceRecords).toBe(1);
    expect(counts.openApprenticeships).toBe(1);
    expect(softwareFamily).toMatchObject({
      opportunity_count: 1,
      evidence_level: "source-backed",
    });
  });

  it("marks previously seen apprenticeship vacancies closed when a later vacancy sync sees different records", () => {
    importSourceResult(db, fixtureResult("2026-07-09T10:00:00.000Z"));
    importSourceResult(db, {
      ...fixtureResult("2026-07-09T10:30:00.000Z", "Business analyst apprenticeship"),
      sourceRecords: [
        {
          id: "source-record-vacancy-2",
          source: "findApprenticeshipEngland",
          sourceId: "vacancy-2",
          kind: "apprenticeship-vacancy",
          title: "Business analyst apprenticeship",
          raw: { title: "Business analyst apprenticeship" },
          tags: ["business"],
        },
      ],
      apprenticeshipVacancies: [
        {
          id: "apprenticeship-2",
          source: "findApprenticeshipEngland",
          sourceId: "vacancy-2",
          title: "Business analyst apprenticeship",
          status: "open",
          tags: ["business"],
          lastSeenAt: "2026-07-09T10:30:00.000Z",
        },
      ],
    });

    const closed = db.prepare("SELECT status FROM apprenticeship_vacancies WHERE id = ?").get("apprenticeship-1") as { status: string };

    expect(closed.status).toBe("closed");
  });

  it("reports missing source freshness before successful sync runs", () => {
    const statuses = getCatalogueSourceStatus(db);

    expect(statuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "ucas",
          freshnessStatus: "missing",
        }),
      ]),
    );
  });
});
