// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThisWeek } from "./this-week";

describe("ThisWeek", () => {
  afterEach(cleanup);

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      tasks: [{
        id: "task-1",
        title: "Check the maths requirement",
        why_it_matters: "A published minimum needs checking.",
        effort_minutes: 20,
        status: "scheduled",
        portfolio_items: { opportunities: { title: "Computing", provider_name: "Example University" } },
        requirements: { label: "A level Mathematics grade B", hard_requirement: true },
      }],
    }), { status: 200 }));
  });

  it("shows task context and uses a keyboard-accessible completion dialog", async () => {
    render(<ThisWeek />);

    expect(await screen.findByText(/For: Computing/)).toBeVisible();
    expect(screen.getByText(/Requirement: A level Mathematics grade B/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(screen.getByRole("dialog", { name: /Complete “Check the maths requirement”/ })).toBeVisible();
    expect(screen.getByLabelText("Optional reflection")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
});
