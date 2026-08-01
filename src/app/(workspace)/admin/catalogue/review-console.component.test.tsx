// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewConsole } from "./review-console";

describe("catalogue review console", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/readiness")) {
        return new Response(JSON.stringify({
          ready: false,
          published: 0,
          minimum: 80,
          globalReasons: ["Published catalogue is below the launch minimum."],
          distribution: [],
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        opportunities: [],
        runs: [],
        issues: [],
        pagination: { page: 1, pageSize: 20, total: 0, pages: 0 },
      }), { status: 200 });
    });
  });

  it("provides labelled keyboard-native queue controls and an empty state", async () => {
    render(<ReviewConsole />);
    expect(await screen.findByRole("heading", { name: "Review queue" })).toBeVisible();
    expect(screen.getByLabelText("Source")).toBeVisible();
    expect(screen.getByLabelText("Route type")).toBeVisible();
    expect(screen.getByLabelText("Sort")).toBeVisible();
    expect(screen.getByRole("button", { name: "Apply queue filters" })).toBeEnabled();
    expect(await screen.findByText("No records match this review queue.")).toBeVisible();
  });

  it("sends filters to the server-side review queue", async () => {
    render(<ReviewConsole />);
    await screen.findByRole("heading", { name: "Review queue" });
    fireEvent.change(screen.getByLabelText("Source"), { target: { value: "discover-uni-hesa" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply queue filters" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("source=discover-uni-hesa")));
  });
});
