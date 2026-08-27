import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";

const deletionReason = z.literal("account-deletion");

export const deletionLedgerEntrySchema = z.object({
  id: z.string().min(1).max(200),
  subject_id: z.string().uuid(),
  deleted_at: z.string().datetime({ offset: true }),
  reason: deletionReason,
});

const writeReceiptSchema = z.object({ entry: deletionLedgerEntrySchema });
const replayBatchSchema = z.object({
  complete: z.literal(true),
  coverage_through: z.string().datetime({ offset: true }),
  entries: z.array(deletionLedgerEntrySchema),
});

export type DeletionLedgerEntry = z.infer<typeof deletionLedgerEntrySchema>;

function config() {
  const env = getServerEnv();
  if (!env.DELETION_LEDGER_URL || !env.DELETION_LEDGER_BEARER_TOKEN) {
    throw new Error("Deletion ledger is not configured");
  }

  return {
    url: env.DELETION_LEDGER_URL,
    bearerToken: env.DELETION_LEDGER_BEARER_TOKEN,
  };
}

async function request(url: URL, init: RequestInit) {
  const { bearerToken } = config();
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${bearerToken}`,
      accept: "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Deletion ledger request failed with ${response.status}`);
  return response.json() as Promise<unknown>;
}

/**
 * The ledger service is deliberately outside Supabase backup scope. Its API
 * must durably acknowledge this record before an account can be deleted.
 */
export async function recordDeletion(subjectId: string, deletedAt = new Date().toISOString()) {
  const input = deletionLedgerEntrySchema.pick({ subject_id: true, deleted_at: true, reason: true }).parse({
    subject_id: subjectId,
    deleted_at: deletedAt,
    reason: "account-deletion",
  });
  const { url } = config();
  const body = await request(new URL(url), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const receipt = writeReceiptSchema.safeParse(body);
  if (!receipt.success || receipt.data.entry.subject_id !== input.subject_id || receipt.data.entry.deleted_at !== input.deleted_at) {
    throw new Error("Deletion ledger returned an invalid write receipt");
  }
  return receipt.data.entry;
}

/**
 * Loads a complete, time-bounded replay batch. The durable ledger service is
 * responsible for the authenticated completeness assertion; callers reject a
 * partial batch or coverage that ends before the requested recovery point.
 */
export async function loadDeletionReplay(from: string, through: string) {
  const start = new Date(from);
  const end = new Date(through);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start > end) {
    throw new Error("Deletion replay range is invalid");
  }

  const { url } = config();
  const endpoint = new URL(url);
  endpoint.searchParams.set("from", from);
  endpoint.searchParams.set("through", through);
  const parsed = replayBatchSchema.safeParse(await request(endpoint, { method: "GET" }));
  if (!parsed.success || new Date(parsed.data.coverage_through) < end) {
    throw new Error("Deletion ledger replay batch is incomplete");
  }
  for (const entry of parsed.data.entries) {
    const deletedAt = new Date(entry.deleted_at);
    if (deletedAt <= start || deletedAt > end) throw new Error("Deletion ledger returned an out-of-range entry");
  }
  return parsed.data.entries;
}
