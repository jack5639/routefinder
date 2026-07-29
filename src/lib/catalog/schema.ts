export const catalogSchemaSql = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_changed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  snapshot_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_runs_source_started_at
ON source_runs(source, started_at DESC);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  website_url TEXT,
  location TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_source_source_id
ON providers(source, source_id);

CREATE TABLE IF NOT EXISTS source_records (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  record_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  source_url TEXT,
  raw_json TEXT NOT NULL,
  snapshot_path TEXT,
  content_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_source_records_source_source_id_kind
ON source_records(source, source_id, record_kind);

CREATE TABLE IF NOT EXISTS university_courses (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  provider_id TEXT,
  provider_name TEXT NOT NULL,
  campus TEXT,
  qualification TEXT,
  duration TEXT,
  study_mode TEXT,
  start_date TEXT,
  tariff TEXT,
  course_url TEXT,
  apply_url TEXT,
  subject TEXT,
  raw_record_id TEXT,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(provider_id) REFERENCES providers(id),
  FOREIGN KEY(raw_record_id) REFERENCES source_records(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_university_courses_source_source_id
ON university_courses(source, source_id);

CREATE TABLE IF NOT EXISTS apprenticeship_vacancies (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  employer_name TEXT,
  training_provider TEXT,
  apprenticeship_level TEXT,
  location TEXT,
  wage TEXT,
  closing_date TEXT,
  start_date TEXT,
  vacancy_url TEXT,
  status TEXT NOT NULL,
  raw_record_id TEXT,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(raw_record_id) REFERENCES source_records(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_apprenticeship_vacancies_source_source_id
ON apprenticeship_vacancies(source, source_id);

CREATE INDEX IF NOT EXISTS idx_apprenticeship_vacancies_status_seen
ON apprenticeship_vacancies(status, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS record_tags (
  record_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  PRIMARY KEY(record_id, tag),
  FOREIGN KEY(record_id) REFERENCES source_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_record_tags_tag
ON record_tags(tag);

CREATE TABLE IF NOT EXISTS route_families (
  id TEXT PRIMARY KEY,
  route_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  evidence_level TEXT NOT NULL,
  opportunity_count INTEGER NOT NULL,
  last_synced_at TEXT,
  freshness_status TEXT NOT NULL,
  source_record_ids_json TEXT NOT NULL,
  opportunities_json TEXT NOT NULL,
  derived_at TEXT NOT NULL
);
`;
