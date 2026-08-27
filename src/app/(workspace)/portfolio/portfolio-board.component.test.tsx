// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PortfolioBoard } from "./portfolio-board";

const assessment = {
  eligibility: { state: "appears-met", reasons: ["Published minimums appear aligned."], risks: [], missingInformation: [], evaluatedPreferences: [], unassessedPreferences: [], directCheckAction: "Check directly." },
  fit: {
    state: "currently-strong",
    reasons: ["Sector: the opportunity is in your selected technology sector."],
    risks: ["This fit view currently assesses sector and route intention only."],
    missingInformation: [],
    evaluatedPreferences: ["Sector: the opportunity is in your selected technology sector.", "Route intention: the opportunity matches your current route intention."],
    unassessedPreferences: ["Location and travel cannot yet be assessed.", "Work styles cannot yet be assessed."],
    directCheckAction: "Check the official listing directly.",
  },
  readiness: { state: "early-stage", reasons: [], risks: [], missingInformation: ["No evidence linked."], evaluatedPreferences: [], unassessedPreferences: [], directCheckAction: "Check directly." },
  informationConfidence: { state: "high", reasons: ["Reviewed source."], risks: [], missingInformation: [], evaluatedPreferences: [], unassessedPreferences: [], directCheckAction: "Check directly." },
  portfolioRole: { state: "qualification-aligned-alternative", reasons: ["Published minimum qualifications appear aligned."], risks: ["This role does not indicate likelihood, competitiveness, or risk."], missingInformation: [], evaluatedPreferences: [], unassessedPreferences: [], directCheckAction: "Check directly." },
};

describe("PortfolioBoard decision-view details", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: "portfolio-1", title: "Computing course", providerName: "Reviewed provider", needsChecking: false, assessment, requirements: [], graph: [] }],
    }), { status: 200 }));
  });

  it("shows the fit limitation before making its details expandable", async () => {
    render(<PortfolioBoard />);
    await screen.findByText("currently strong");
    expect(screen.getByText("Limited view: 2 preference areas assessed; 2 not assessed yet.")).toBeVisible();

    const details = Array.from(document.querySelectorAll("details")).find((element) => element.textContent?.includes("Assessed"));
    expect(details).not.toBeNull();
    const summary = details?.querySelector("summary");
    expect(summary?.tagName).toBe("SUMMARY");

    fireEvent.click(summary!);
    await waitFor(() => expect(within(details!).getByText("Not assessed yet")).toBeVisible());
    expect(within(details!).getByText("Location and travel cannot yet be assessed.")).toBeVisible();
    expect(within(details!).getByText("Work styles cannot yet be assessed.")).toBeVisible();
    expect(within(details!).getByText("Checks to make")).toBeVisible();
  });

  it("keeps a hidden saved record identifiable and warns against relying on it to apply", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [{
        id: "portfolio-2",
        title: "Former software vacancy",
        providerName: "Example employer",
        externalUrl: "https://example.com/source",
        needsChecking: true,
        savedStatus: { code: "catalogue-changed", message: "This saved reviewed record no longer passes the public catalogue safety checks.", doNotApply: true },
        assessment: null,
        requirements: [],
        graph: [],
      }],
    }), { status: 200 }));

    render(<PortfolioBoard />);
    expect(await screen.findByText("Former software vacancy")).toBeVisible();
    expect(screen.getByText("Do not rely on this saved record to apply.")).toBeVisible();
    expect(screen.getByRole("link", { name: /check the current source/i })).toHaveAttribute("href", "https://example.com/source");
  });
});
