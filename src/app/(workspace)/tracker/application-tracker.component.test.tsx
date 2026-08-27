// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationTracker } from "./application-tracker";

describe("ApplicationTracker saved opportunity continuity", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn((input) => {
      const url = String(input);
      if (url === "/api/applications") {
        return Promise.resolve(new Response(JSON.stringify({
          applications: [{
            id: "application-1",
            stage: "planned",
            official_url: "https://example.com/apply",
            portfolio_items: {
              opportunity_snapshot: {
                title: "Former software vacancy",
                providerName: "Example employer",
                applicationUrl: "https://example.com/apply",
                state: "unknown",
              },
            },
          }],
        }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 }));
    }) as typeof fetch;
  });

  it("keeps a hidden catalogue record identifiable and labels the saved copy", async () => {
    render(<ApplicationTracker />);

    expect(await screen.findByRole("heading", { name: "Former software vacancy" })).toBeVisible();
    expect(screen.getByText("Example employer")).toBeVisible();
    expect(screen.getByText(/This is the copy you saved/)).toBeVisible();
    expect(screen.getByRole("link", { name: /Official destination/ })).toHaveAttribute("href", "https://example.com/apply");
  });
});
