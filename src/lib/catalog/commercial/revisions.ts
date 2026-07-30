import { createHash } from "node:crypto";

export const catalogueFields = ["title", "provider_name", "location", "summary", "deadline", "application_url", "source_url", "state", "sector"] as const;
export type CatalogueField = (typeof catalogueFields)[number];
export type CommercialSector = "technology" | "engineering" | "business" | "finance" | "unclassified";

export function hashSnapshot(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function changedFields(current: Record<string, unknown>, proposed: Record<string, unknown>) {
  return Object.fromEntries(catalogueFields.flatMap((field) =>
    current[field] === proposed[field] ? [] : [[field, { from: current[field] ?? null, to: proposed[field] ?? null }]],
  ));
}

export function hasChanges(changes: Record<string, unknown>) {
  return Object.keys(changes).length > 0;
}

export function freshnessExpiry(retrievedAt: string, days: number) {
  return new Date(new Date(retrievedAt).getTime() + days * 86_400_000).toISOString();
}
