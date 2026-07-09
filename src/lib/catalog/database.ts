import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import { getCatalogDbPath } from "@/lib/catalog/config";
import { catalogSchemaSql } from "@/lib/catalog/schema";

type DatabaseSyncConstructor = typeof import("node:sqlite").DatabaseSync;

const loadNodeSqlite = new Function("moduleName", "return require(moduleName)") as (
  moduleName: string,
) => typeof import("node:sqlite");
const fallbackRequire = createRequire(import.meta.url);
const sqliteModuleName = "node:" + "sqlite";
let databaseSyncConstructor: DatabaseSyncConstructor | null = null;

function getDatabaseSync() {
  if (databaseSyncConstructor) {
    return databaseSyncConstructor;
  }

  const sqliteModule = (() => {
    try {
      return loadNodeSqlite(sqliteModuleName);
    } catch {
      return fallbackRequire(sqliteModuleName) as typeof import("node:sqlite");
    }
  })();

  databaseSyncConstructor = sqliteModule.DatabaseSync;
  return databaseSyncConstructor;
}

export type CatalogDatabase = InstanceType<DatabaseSyncConstructor>;

export function openCatalogDatabase(options: { readOnly?: boolean; path?: string } = {}) {
  const dbPath = options.path ?? getCatalogDbPath();

  if (!options.readOnly) {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const DatabaseSync = getDatabaseSync();
  const db = new DatabaseSync(dbPath, {
    open: true,
    readOnly: options.readOnly ?? false,
  });

  db.exec("PRAGMA busy_timeout = 5000");
  return db;
}

export function applyCatalogSchema(db: CatalogDatabase) {
  db.exec(catalogSchemaSql);
}

export function initCatalogDatabase(path?: string) {
  const db = openCatalogDatabase({ path });
  applyCatalogSchema(db);
  return db;
}

export function withCatalogDatabase<T>(callback: (db: CatalogDatabase) => T, options: { readOnly?: boolean; path?: string } = {}) {
  const db = openCatalogDatabase(options);

  try {
    if (!options.readOnly) {
      applyCatalogSchema(db);
    }

    return callback(db);
  } finally {
    db.close();
  }
}

export function transaction<T>(db: CatalogDatabase, callback: () => T) {
  db.exec("BEGIN");

  try {
    const result = callback();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
