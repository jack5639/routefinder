import { z } from "zod";

export const opportunitySnapshotSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(240),
  providerName: z.string().min(1).max(240),
  kind: z.enum(["university-course", "apprenticeship-vacancy"]),
  sector: z.enum(["technology", "engineering", "business", "finance", "unclassified"]),
  location: z.string().min(1).max(240),
  applicationUrl: z.string().url(),
  sourceUrl: z.string().url(),
  sourceAuthority: z.string().min(1).max(120),
  deadline: z.string().datetime().nullable().optional(),
  state: z.enum(["open", "closed", "unknown"]),
  freshness: z.enum(["high", "medium", "low", "needs-checking"]),
  publicationState: z.enum(["draft", "review", "published", "withdrawn"]),
  verifiedAt: z.string().datetime().nullable().optional(),
  savedAt: z.string().datetime(),
}).strict();

export type OpportunitySnapshot = z.infer<typeof opportunitySnapshotSchema>;

export function safeOpportunitySnapshot(row: Record<string, unknown>, savedAt = new Date().toISOString()): OpportunitySnapshot {
  return opportunitySnapshotSchema.parse({
    id: row.id,
    title: row.title,
    providerName: row.provider_name,
    kind: row.kind,
    sector: row.sector,
    location: row.location,
    applicationUrl: row.application_url,
    sourceUrl: row.source_url,
    sourceAuthority: row.source_authority,
    deadline: row.deadline ?? null,
    state: row.state,
    freshness: row.freshness,
    publicationState: row.publication_state,
    verifiedAt: row.verified_at ?? null,
    savedAt,
  });
}

export function parseOpportunitySnapshot(value: unknown) {
  const parsed = opportunitySnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
