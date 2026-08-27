import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient }));

import { GET } from "@/app/api/opportunities/route";

describe("GET /api/opportunities", () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder = {
    select: (...args: unknown[]) => { calls.push({ method: "select", args }); return builder; },
    eq: (...args: unknown[]) => { calls.push({ method: "eq", args }); return builder; },
    or: (...args: unknown[]) => { calls.push({ method: "or", args }); return builder; },
    in: (...args: unknown[]) => { calls.push({ method: "in", args }); return builder; },
    gt: (...args: unknown[]) => { calls.push({ method: "gt", args }); return builder; },
    gte: (...args: unknown[]) => { calls.push({ method: "gte", args }); return builder; },
    ilike: (...args: unknown[]) => { calls.push({ method: "ilike", args }); return builder; },
    order: (...args: unknown[]) => { calls.push({ method: "order", args }); return builder; },
    range: (...args: unknown[]) => { calls.push({ method: "range", args }); return builder; },
    then: (resolve: (value: { data: never[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
  };

  beforeEach(() => {
    calls.length = 0;
    createClient.mockClear();
    createClient.mockResolvedValue({ from: vi.fn(() => builder) });
  });

  it("filters public results to open, current, deadline-safe records", async () => {
    const response = await GET(new Request("https://example.com/api/opportunities?kind=university-course"));
    expect(response.status).toBe(200);

    expect(calls).toContainEqual({ method: "eq", args: ["publication_state", "published"] });
    expect(calls).toContainEqual({ method: "eq", args: ["state", "open"] });
    expect(calls).toContainEqual({ method: "in", args: ["freshness", ["high", "medium"]] });
    expect(calls.some(({ method, args }) => method === "gt" && args[0] === "freshness_expires_at")).toBe(true);
    expect(calls.some(({ method, args }) => method === "gte" && args[0] === "verified_at")).toBe(true);

    const deadlineFilter = calls.find(({ method }) => method === "or")?.args[0];
    expect(deadlineFilter).toEqual(expect.stringContaining("deadline.gt."));
    expect(deadlineFilter).toEqual(expect.stringContaining("deadline.is.null"));
    expect(deadlineFilter).toEqual(expect.stringContaining("application_cycle.eq.2027"));
    expect(calls).toContainEqual({ method: "range", args: [0, 12] });
  });

  it("applies text search in the database before bounded pagination", async () => {
    await GET(new Request("https://example.com/api/opportunities?q=software&page=2&pageSize=8"));

    const textFilterIndex = calls.findIndex(({ method, args }) => method === "or" && String(args[0]).includes("title.ilike"));
    const rangeIndex = calls.findIndex(({ method }) => method === "range");
    expect(textFilterIndex).toBeGreaterThan(-1);
    expect(rangeIndex).toBeGreaterThan(textFilterIndex);
    expect(calls[rangeIndex]).toEqual({ method: "range", args: [8, 16] });
  });

  it("rejects unbounded or filter-injection-shaped queries", async () => {
    const response = await GET(new Request("https://example.com/api/opportunities?q=software%29%2Cstate.eq.closed&pageSize=100"));

    expect(response.status).toBe(400);
    expect(createClient).not.toHaveBeenCalled();
  });
});
