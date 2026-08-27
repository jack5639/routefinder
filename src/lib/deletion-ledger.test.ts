import { afterEach, describe, expect, it, vi } from "vitest";

const { getServerEnv } = vi.hoisted(() => ({ getServerEnv: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env", () => ({ getServerEnv }));

import { loadDeletionReplay, recordDeletion } from "@/lib/deletion-ledger";

const subjectId = "00000000-0000-4000-8000-000000000001";
const deletedAt = "2026-07-31T10:00:00.000Z";

describe("deletion ledger boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires a matching durable receipt before deletion can continue", async () => {
    getServerEnv.mockReturnValue({ DELETION_LEDGER_URL: "https://ledger.example.test/deletions", DELETION_LEDGER_BEARER_TOKEN: "test-token" });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ entry: { id: "entry-1", subject_id: subjectId, deleted_at: deletedAt, reason: "account-deletion" } })));
    vi.stubGlobal("fetch", fetch);

    await expect(recordDeletion(subjectId, deletedAt)).resolves.toMatchObject({ subject_id: subjectId });
    expect(fetch).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({ method: "POST" }));
  });

  it("fails closed for incomplete, malformed, or out-of-range replay data", async () => {
    getServerEnv.mockReturnValue({ DELETION_LEDGER_URL: "https://ledger.example.test/deletions", DELETION_LEDGER_BEARER_TOKEN: "test-token" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      complete: true,
      coverage_through: "2026-07-31T09:59:59.000Z",
      entries: [],
    }))));

    await expect(loadDeletionReplay("2026-07-31T09:00:00.000Z", deletedAt)).rejects.toThrow("incomplete");
  });
});
