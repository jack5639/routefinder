import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mockRoutes } from "@/data/routes/mock-routes";
import { sourceLabels, sourceStaleAfterMinutes } from "@/lib/catalog/config";
import type { CatalogDatabase } from "@/lib/catalog/database";
import { transaction } from "@/lib/catalog/database";
import type { SourceFetchResult } from "@/lib/catalog/sources/types";
import { normaliseKey, slugify, stableHash } from "@/lib/catalog/text";
import type { ApprenticeshipVacancy, CatalogSource, CatalogueFreshness, CatalogSourceStatus, RouteOpportunity } from "@/types";

function nullable(value: string | undefined | null) {
  return value?.trim() ? value : null;
}

function json(value: unknown) {
  return JSON.stringify(value);
}

function sourceStatusFromSync(lastSuccessfulSync: string | undefined, latestStatus: string | undefined, source: CatalogSource) {
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

function sourceRecordHash(record: { raw: Record<string, unknown> }) {
  return stableHash(record.raw);
}

export function beginSourceRun(db: CatalogDatabase, source: CatalogSource, startedAt = new Date().toISOString()) {
  const result = db
    .prepare("INSERT INTO source_runs (source, status, started_at) VALUES (?, 'running', ?)")
    .run(source, startedAt);
  return Number(result.lastInsertRowid);
}

export function completeSourceRun(
  db: CatalogDatabase,
  runId: number,
  values: {
    status: "success" | "failed";
    recordsSeen: number;
    recordsChanged: number;
    snapshotPath?: string;
    errorMessage?: string;
    finishedAt?: string;
  },
) {
  db.prepare(
    `UPDATE source_runs
     SET status = ?, finished_at = ?, records_seen = ?, records_changed = ?, snapshot_path = ?, error_message = ?
     WHERE id = ?`,
  ).run(
    values.status,
    values.finishedAt ?? new Date().toISOString(),
    values.recordsSeen,
    values.recordsChanged,
    values.snapshotPath ?? null,
    values.errorMessage ?? null,
    runId,
  );
}

export function writeSourceSnapshot(result: SourceFetchResult, runId: number, rootPath = "data/catalog/snapshots") {
  const sourceDir = join(process.cwd(), rootPath, result.source, String(runId));
  mkdirSync(sourceDir, { recursive: true });

  const manifest = {
    source: result.source,
    fetchedAt: result.fetchedAt,
    pages: result.pages.map((page, index) => {
      const filename = `page-${index + 1}.html`;
      writeFileSync(join(sourceDir, filename), page.html, "utf8");
      return {
        url: page.url,
        label: page.label,
        fetchedAt: page.fetchedAt,
        filename,
      };
    }),
  };

  writeFileSync(join(sourceDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return join(rootPath, result.source, String(runId), "manifest.json").replace(/\\/g, "/");
}

function upsertProvider(db: CatalogDatabase, source: CatalogSource, sourceId: string, providerName: string, updatedAt: string) {
  const providerId = `provider-${stableHash(`${source}:${sourceId}:${normaliseKey(providerName)}`)}`;

  db.prepare(
    `INSERT INTO providers (id, name, source, source_id, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       updated_at = excluded.updated_at`,
  ).run(providerId, providerName, source, sourceId, updatedAt);

  return providerId;
}

function upsertRecordTags(db: CatalogDatabase, recordId: string, tags: string[]) {
  db.prepare("DELETE FROM record_tags WHERE record_id = ?").run(recordId);

  const insertTag = db.prepare("INSERT OR IGNORE INTO record_tags (record_id, tag) VALUES (?, ?)");
  tags.forEach((tag) => {
    insertTag.run(recordId, normaliseKey(tag));
  });
}

export function importSourceResult(db: CatalogDatabase, result: SourceFetchResult, snapshotPath?: string) {
  return transaction(db, () => {
    let recordsChanged = 0;
    const rawRecordIdByKey = new Map(result.sourceRecords.map((record) => [`${record.kind}:${record.sourceId}`, record.id]));
    const existingRecord = db.prepare("SELECT content_hash FROM source_records WHERE id = ?");
    const insertRecord = db.prepare(
      `INSERT INTO source_records (
        id, source, source_id, record_kind, title, source_url, raw_json, snapshot_path, content_hash, first_seen_at, last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        source_url = excluded.source_url,
        raw_json = excluded.raw_json,
        snapshot_path = excluded.snapshot_path,
        content_hash = excluded.content_hash,
        last_seen_at = excluded.last_seen_at`,
    );

    result.sourceRecords.forEach((record) => {
      const contentHash = sourceRecordHash(record);
      const existing = existingRecord.get(record.id) as { content_hash: string } | undefined;

      if (!existing || existing.content_hash !== contentHash) {
        recordsChanged += 1;
      }

      insertRecord.run(
        record.id,
        record.source,
        record.sourceId,
        record.kind,
        record.title,
        record.sourceUrl ?? null,
        json(record.raw),
        snapshotPath ?? null,
        contentHash,
        result.fetchedAt,
        result.fetchedAt,
      );
      upsertRecordTags(db, record.id, record.tags);
    });

    const upsertCourse = db.prepare(
      `INSERT INTO university_courses (
        id, source, source_id, title, provider_id, provider_name, campus, qualification, duration,
        study_mode, start_date, tariff, course_url, apply_url, subject, raw_record_id, last_seen_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        provider_id = excluded.provider_id,
        provider_name = excluded.provider_name,
        campus = excluded.campus,
        qualification = excluded.qualification,
        duration = excluded.duration,
        study_mode = excluded.study_mode,
        start_date = excluded.start_date,
        tariff = excluded.tariff,
        course_url = excluded.course_url,
        apply_url = excluded.apply_url,
        subject = excluded.subject,
        raw_record_id = excluded.raw_record_id,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at`,
    );

    result.universityCourses.forEach((course) => {
      const rawRecordId = rawRecordIdByKey.get(`university-course:${course.sourceId}`) ?? null;
      const providerId = upsertProvider(db, course.source, course.providerName, course.providerName, result.fetchedAt);

      upsertCourse.run(
        course.id,
        course.source,
        course.sourceId,
        course.title,
        providerId,
        course.providerName,
        nullable(course.campus),
        nullable(course.qualification),
        nullable(course.duration),
        nullable(course.studyMode),
        nullable(course.startDate),
        nullable(course.tariff),
        nullable(course.courseUrl),
        nullable(course.applyUrl),
        nullable(course.subject),
        rawRecordId,
        result.fetchedAt,
        result.fetchedAt,
      );
    });

    const upsertVacancy = db.prepare(
      `INSERT INTO apprenticeship_vacancies (
        id, source, source_id, title, employer_name, training_provider, apprenticeship_level, location,
        wage, closing_date, start_date, vacancy_url, status, raw_record_id, last_seen_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        employer_name = excluded.employer_name,
        training_provider = excluded.training_provider,
        apprenticeship_level = excluded.apprenticeship_level,
        location = excluded.location,
        wage = excluded.wage,
        closing_date = excluded.closing_date,
        start_date = excluded.start_date,
        vacancy_url = excluded.vacancy_url,
        status = excluded.status,
        raw_record_id = excluded.raw_record_id,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at`,
    );

    result.apprenticeshipVacancies.forEach((vacancy) => {
      const rawRecordId = rawRecordIdByKey.get(`apprenticeship-vacancy:${vacancy.sourceId}`) ?? null;

      upsertVacancy.run(
        vacancy.id,
        vacancy.source,
        vacancy.sourceId,
        vacancy.title,
        nullable(vacancy.employerName),
        nullable(vacancy.trainingProvider),
        nullable(vacancy.apprenticeshipLevel),
        nullable(vacancy.location),
        nullable(vacancy.wage),
        nullable(vacancy.closingDate),
        nullable(vacancy.startDate),
        nullable(vacancy.vacancyUrl),
        vacancy.status,
        rawRecordId,
        result.fetchedAt,
        result.fetchedAt,
      );
    });

    if (result.apprenticeshipVacancies.length > 0) {
      db.prepare(
        `UPDATE apprenticeship_vacancies
         SET status = 'closed', updated_at = ?
         WHERE source = ? AND status = 'open' AND last_seen_at < ?`,
      ).run(result.fetchedAt, result.source, result.fetchedAt);
    }

    return {
      recordsSeen: result.sourceRecords.length,
      recordsChanged,
    };
  });
}

function opportunityFreshness(lastSeenAt: string, source: CatalogSource): CatalogueFreshness {
  return sourceStatusFromSync(lastSeenAt, "success", source);
}

function routeMatchesText(routeValues: string[], searchableText: string, tags: string[]) {
  const routeTerms = routeValues.map(normaliseKey).filter(Boolean);
  const searchable = normaliseKey(searchableText);
  const tagSet = new Set(tags.map(normaliseKey));

  return routeTerms.some((term) => searchable.includes(term) || tagSet.has(term));
}

function toCourseOpportunity(row: Record<string, string>): RouteOpportunity {
  return {
    id: row.id,
    source: row.source as CatalogSource,
    kind: "university-course",
    title: row.title,
    providerName: row.provider_name,
    location: row.campus ?? undefined,
    summary: [row.qualification, row.duration, row.study_mode, row.tariff ? `Tariff ${row.tariff}` : ""].filter(Boolean).join(" · "),
    sourceUrl: row.course_url ?? undefined,
    applyUrl: row.apply_url ?? row.course_url ?? undefined,
    startDate: row.start_date ?? undefined,
    freshnessStatus: opportunityFreshness(row.last_seen_at, row.source as CatalogSource),
    lastSeenAt: row.last_seen_at,
  };
}

function toVacancyOpportunity(row: Record<string, string>): RouteOpportunity {
  return {
    id: row.id,
    source: row.source as CatalogSource,
    kind: "apprenticeship-vacancy",
    title: row.title,
    employerName: row.employer_name ?? undefined,
    providerName: row.training_provider ?? undefined,
    location: row.location ?? undefined,
    summary: [row.apprenticeship_level, row.employer_name, row.location].filter(Boolean).join(" · "),
    deadline: row.closing_date ?? undefined,
    startDate: row.start_date ?? undefined,
    costOrPay: row.wage ?? undefined,
    sourceUrl: row.vacancy_url ?? undefined,
    applyUrl: row.vacancy_url ?? undefined,
    freshnessStatus: opportunityFreshness(row.last_seen_at, row.source as CatalogSource),
    lastSeenAt: row.last_seen_at,
  };
}

export function deriveRouteFamilies(db: CatalogDatabase) {
  const now = new Date().toISOString();
  const courses = db
    .prepare(
      `SELECT c.*, COALESCE(group_concat(t.tag, ' '), '') AS tags
       FROM university_courses c
       LEFT JOIN record_tags t ON t.record_id = c.raw_record_id
       GROUP BY c.id
       ORDER BY c.last_seen_at DESC`,
    )
    .all() as Array<Record<string, string>>;
  const vacancies = db
    .prepare(
      `SELECT v.*, COALESCE(group_concat(t.tag, ' '), '') AS tags
       FROM apprenticeship_vacancies v
       LEFT JOIN record_tags t ON t.record_id = v.raw_record_id
       WHERE v.status != 'closed'
       GROUP BY v.id
       ORDER BY v.last_seen_at DESC`,
    )
    .all() as Array<Record<string, string>>;
  const upsertFamily = db.prepare(
    `INSERT INTO route_families (
      id, route_type, title, summary, source_kind, evidence_level, opportunity_count, last_synced_at,
      freshness_status, source_record_ids_json, opportunities_json, derived_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      route_type = excluded.route_type,
      title = excluded.title,
      summary = excluded.summary,
      source_kind = excluded.source_kind,
      evidence_level = excluded.evidence_level,
      opportunity_count = excluded.opportunity_count,
      last_synced_at = excluded.last_synced_at,
      freshness_status = excluded.freshness_status,
      source_record_ids_json = excluded.source_record_ids_json,
      opportunities_json = excluded.opportunities_json,
      derived_at = excluded.derived_at`,
  );

  transaction(db, () => {
    mockRoutes.forEach((route) => {
      const matchValues = [...route.relatedInterests, ...route.relatedCareers, ...route.relatedCourses];
      const sourceRows =
        route.type.includes("apprenticeship") || route.type === "Direct work/training"
          ? vacancies.filter((vacancy) =>
              routeMatchesText(
                matchValues,
                [vacancy.title, vacancy.employer_name, vacancy.training_provider, vacancy.apprenticeship_level, vacancy.location].join(" "),
                (vacancy.tags ?? "").split(" "),
              ),
            )
          : courses.filter((course) =>
              routeMatchesText(
                matchValues,
                [course.title, course.provider_name, course.campus, course.qualification, course.subject].join(" "),
                (course.tags ?? "").split(" "),
              ),
            );
      const opportunities = sourceRows
        .slice(0, 5)
        .map((row) => (route.type.includes("apprenticeship") || route.type === "Direct work/training" ? toVacancyOpportunity(row) : toCourseOpportunity(row)));
      const latestSeen = sourceRows
        .map((row) => row.last_seen_at)
        .filter(Boolean)
        .sort()
        .at(-1);
      const sourceRecordIds = sourceRows.map((row) => row.raw_record_id).filter(Boolean).slice(0, 100);
      const sourceForFreshness =
        route.type.includes("apprenticeship") || route.type === "Direct work/training" ? "findApprenticeshipEngland" : "ucas";
      const freshnessStatus = latestSeen ? sourceStatusFromSync(latestSeen, "success", sourceForFreshness) : "missing";
      const evidenceLevel = sourceRows.length ? "source-backed" : "partial";

      upsertFamily.run(
        route.id,
        route.type,
        route.title,
        route.summary,
        sourceRows.length ? "derived-family" : "demo",
        evidenceLevel,
        sourceRows.length,
        latestSeen ?? null,
        freshnessStatus,
        json(sourceRecordIds),
        json(opportunities),
        now,
      );
    });
  });
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

export function routeFamilySourceId(title: string, type: string) {
  return `route-family-${slugify(`${title}-${type}`)}`;
}
