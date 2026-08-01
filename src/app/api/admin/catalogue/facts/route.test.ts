import { beforeEach, describe, expect, it, vi } from "vitest";

const { getApiContext } = vi.hoisted(() => ({ getApiContext: vi.fn() }));

vi.mock("@/lib/api-context", () => ({
  getApiContext,
  parseJson: (request: Request) => request.json(),
  apiError: (message: string, status: number, code: string) => new Response(JSON.stringify({ error: { message, code } }), { status }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
  isAdminEmail: () => true,
}));

import { POST } from "@/app/api/admin/catalogue/facts/route";

describe("POST /api/admin/catalogue/facts", () => {
  beforeEach(() => {
    getApiContext.mockResolvedValue({ user: { id: "user-1", email: "admin@example.com" } });
  });

  it.each([
    ["an unsupported hard-requirement kind", { kind: "skill", hardRequirement: true, qualificationType: "A level", subject: "Mathematics", minimumGrade: "B" }],
    ["an incomplete hard rule", { kind: "grade", hardRequirement: true, qualificationType: "A level", subject: "Mathematics" }],
    ["an unsupported grade scale", { kind: "grade", hardRequirement: true, qualificationType: "BTEC", subject: "Computing", minimumGrade: "D*" }],
  ])("rejects %s", async (_case, values) => {
    const response = await POST(new Request("https://example.com/api/admin/catalogue/facts", {
      method: "POST",
      body: JSON.stringify({
        action: "add-requirement",
        opportunityId: "00000000-0000-4000-8000-000000000001",
        label: "A test requirement",
        supportingText: "Published source wording.",
        sourceUrl: "https://example.com/source",
        ...values,
      }),
    }));

    expect(response.status).toBe(422);
  });
});
