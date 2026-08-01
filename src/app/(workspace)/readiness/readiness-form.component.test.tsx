// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, refresh } = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

import { ReadinessForm } from "./readiness-form";

const qualificationId = "00000000-0000-4000-8000-000000000002";
const profile = {
  profile: {
    current_stage: "Year 13", application_cycle: 2027, home_region: "West Midlands", max_travel_minutes: 60,
    relocation_preference: "unsure", route_intent: "combined", sectors: ["technology"], work_styles: [],
    financial_preference: "open", constraints: [], qualifications_complete: true,
  },
  qualifications: [{ id: qualificationId, qualification_type: "A level", subject: "Mathematics", grade: "A", status: "achieved" }],
};

describe("ReadinessForm qualification rows", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(profile), { status: 200 }))
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  });

  async function load() {
    render(<ReadinessForm />);
    await screen.findByDisplayValue("Mathematics");
  }

  it("preserves an existing achieved row and its identifier when saving", async () => {
    await load();
    fireEvent.click(screen.getByRole("button", { name: "Save and find opportunities" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(3));
    const [, request] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[2];
    const body = JSON.parse(request.body);
    expect(body.qualifications).toEqual([expect.objectContaining({ id: qualificationId, status: "achieved", grade: "A" })]);
  });

  it("keeps unknown grades explicit and grade-free", async () => {
    await load();
    const row = screen.getByRole("group", { name: "Qualification 1" });
    fireEvent.change(within(row).getByLabelText("Result status"), { target: { value: "unknown" } });
    expect(within(row).getByLabelText("Grade")).toBeDisabled();
    expect(within(row).getByLabelText("Grade")).toHaveValue("");
  });

  it("makes unsupported qualification types visible", async () => {
    await load();
    const row = screen.getByRole("group", { name: "Qualification 1" });
    fireEvent.change(within(row).getByLabelText("Qualification type"), { target: { value: "BTEC" } });
    expect(screen.getByText(/cannot compare it deterministically yet/i)).toBeVisible();
  });

  it("retains the entered row after a save failure", async () => {
    await load();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Unable to save" } }), { status: 503 }));
    fireEvent.click(screen.getByRole("button", { name: "Save and find opportunities" }));
    await screen.findByRole("alert");
    expect(screen.getByDisplayValue("Mathematics")).toBeVisible();
    expect(within(screen.getByRole("group", { name: "Qualification 1" })).getByLabelText("Result status")).toHaveValue("achieved");
    expect(push).not.toHaveBeenCalled();
  });
});
