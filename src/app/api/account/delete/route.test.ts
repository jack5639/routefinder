import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMutationApiContext, recordDeletion } = vi.hoisted(() => ({
  getMutationApiContext: vi.fn(),
  recordDeletion: vi.fn(),
}));

vi.mock("@/lib/api-context", () => ({
  getMutationApiContext,
  parseJson: (request: Request) => request.json(),
  apiError: (message: string, status = 400, code = "invalid") => new Response(JSON.stringify({ error: { message, code } }), { status }),
}));
vi.mock("@/lib/deletion-ledger", () => ({ recordDeletion }));

import { POST } from "@/app/api/account/delete/route";

const userId = "00000000-0000-4000-8000-000000000001";

describe("POST /api/account/delete", () => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));
  const deleteUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    recordDeletion.mockResolvedValue({ id: "entry-1" });
    deleteUser.mockResolvedValue({ error: null });
    getMutationApiContext.mockResolvedValue({ user: { id: userId }, admin: { from, auth: { admin: { deleteUser } } } });
  });

  it("does not delete the Auth user when the durable ledger is unavailable", async () => {
    recordDeletion.mockRejectedValue(new Error("unavailable"));

    const response = await POST(new Request("https://example.test/api/account/delete", { method: "POST", body: JSON.stringify({ confirmation: "DELETE" }) }));

    expect(response.status).toBe(503);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("records deletion outside the backup boundary before deleting the Auth user", async () => {
    const response = await POST(new Request("https://example.test/api/account/delete", { method: "POST", body: JSON.stringify({ confirmation: "DELETE" }) }));

    expect(response.status).toBe(200);
    expect(recordDeletion).toHaveBeenCalledWith(userId);
    expect(deleteUser).toHaveBeenCalledWith(userId);
  });
});
