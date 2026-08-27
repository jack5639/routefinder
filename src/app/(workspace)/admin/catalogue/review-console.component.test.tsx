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
          distribution: [{
            sector: "technology",
            kind: "university-course",
            count: 0,
            shortfall: 10,
            candidates: 12,
            distinctCandidateProviders: 8,
          }],
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

  it("turns a readiness shortfall into a filtered candidate queue", async () => {
    render(<ReviewConsole />);
    fireEvent.click(await screen.findByRole("button", { name: "Review this cell" }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("kind=university-course"));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("sector=technology"));
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("publication=draft"));
    });
  });

  it("records an admin source attestation without requesting a document reference", async () => {
    render(<ReviewConsole />);
    const note = await screen.findByLabelText("Find an Apprenticeship API permission attestation note");
    fireEvent.change(note, { target: { value: "Confirmed the Display Vacancy Advert API terms for this use." } });
    fireEvent.click(screen.getAllByRole("button", { name: "Confirm source permission" })[0]);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/admin/catalogue/sources", expect.objectContaining({ method: "POST" })));
  });

  it("requires an audit note before an open opportunity can be confirmed from its source", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/readiness")) return new Response(JSON.stringify({ ready: false, published: 0, minimum: 80, globalReasons: [], distribution: [], sourceAttestations: [] }), { status: 200 });
      if (url.includes("/api/admin/catalogue?")) return new Response(JSON.stringify({
        opportunities: [{
          id: "opportunity-1", kind: "apprenticeship-vacancy", sector: "technology", title: "Software apprentice", provider_name: "Employer", location: "London", summary: "Candidate", application_url: "https://example.com/apply", source_url: "https://example.com/source", source_authority: "find-an-apprenticeship-api-v2", publication_state: "draft", freshness: "needs-checking", state: "open", retrieved_at: "2026-08-02T00:00:00.000Z", requirements: [], catalogue_fact_revisions: [], source_issues: [], publication_reviews: [], catalogue_manual_revisions: [], readinessFailures: ["No reviewed published requirement is present."],
        }], runs: [], issues: [], pagination: { page: 1, pageSize: 20, total: 1, pages: 1 },
      }), { status: 200 });
      return new Response(JSON.stringify({ saved: true }), { status: 200 });
    });
    render(<ReviewConsole />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm facts after source check" }));
    expect(await screen.findByText("Add a reviewer note after checking the official source before confirming opportunity facts.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Mandatory publication note"), { target: { value: "Checked the official vacancy page." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm facts after source check" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/admin/catalogue/facts", expect.objectContaining({ method: "POST", body: expect.stringContaining("verify-opportunity") })));
  });
});
