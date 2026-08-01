import { beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, getMutationApiContext } = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getMutationApiContext: vi.fn(),
}));

vi.mock("@/lib/api-context", () => ({
  consumeRateLimit,
  getMutationApiContext,
  parseJson: (request: Request) => request.json(),
  apiError: (message: string, status: number, code: string) => new Response(JSON.stringify({ error: { message, code } }), { status }),
}));

import { PUT } from "@/app/api/profile/route";

const userId = "00000000-0000-4000-8000-000000000001";
const qualificationId = "00000000-0000-4000-8000-000000000002";

function payload() {
  return {
    currentStage: "Year 13", applicationCycle: 2027, homeRegion: "West Midlands", maxTravelMinutes: 60,
    relocationPreference: "unsure", routeIntent: "combined", sectors: ["technology"], workStyles: [],
    financialPreference: "open", constraints: [], qualificationsComplete: true, policyVersion: "2026-07-29",
    qualifications: [
      { id: qualificationId, qualificationType: "A level", subject: "Mathematics", grade: "A", status: "achieved" },
      { qualificationType: "GCSE", subject: "English Language", status: "unknown" },
    ],
  };
}

describe("PUT /api/profile", () => {
  const rpc = vi.fn();
  const from = vi.fn(() => ({ upsert: vi.fn(), insert: vi.fn() }));

  beforeEach(() => {
    vi.clearAllMocks();
    consumeRateLimit.mockResolvedValue(true);
    rpc.mockResolvedValue({ error: null });
    getMutationApiContext.mockResolvedValue({ user: { id: userId }, admin: { rpc, from } });
  });

  it("sends profile, consent, preserved IDs and statuses to one transactional RPC", async () => {
    const response = await PUT(new Request("https://example.com/api/profile", { method: "PUT", body: JSON.stringify(payload()) }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("save_readiness_profile", expect.objectContaining({
      p_user_id: userId,
      p_policy_version: "2026-07-29",
      p_profile: expect.objectContaining({ qualifications_complete: true }),
      p_qualifications: [
        expect.objectContaining({ id: qualificationId, status: "achieved", grade: "A" }),
        expect.objectContaining({ qualification_type: "GCSE", status: "unknown", grade: null }),
      ],
    }));
  });

  it("does not record follow-up writes when transactional replacement fails", async () => {
    rpc.mockResolvedValue({ error: { message: "insert failed" } });
    const response = await PUT(new Request("https://example.com/api/profile", { method: "PUT", body: JSON.stringify(payload()) }));
    expect(response.status).toBe(503);
    expect(from).not.toHaveBeenCalled();
  });
});
